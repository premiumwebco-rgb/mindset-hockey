import { NextResponse } from 'next/server';
import { getSession, canUse, DEMO_MODE } from '@/lib/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import {
  analyzeShotWithRepair,
  analyzerConfigured,
  configuredModel,
  AnalyzerNotConfiguredError,
  takeFailedUsage,
} from '@/lib/ai/analyzer';
import { ModelOutputError } from '@/lib/ai/schema';
import { verifyUpload, storeFrames, loadFrames } from '@/lib/ai/storage';
import { reserveAnalysis, commitReservation, releaseReservation } from '@/lib/ai/quota';
import { verifyStoredDuration, durationErrorMessage } from '@/lib/ai/duration';
import { MAX_FRAMES, MAX_FRAME_BYTES, isShotType, isCameraAngle } from '@/lib/ai/config';

export const runtime = 'nodejs';
/**
 * Must exceed AI_TIMEOUT_MS (default 90s) plus frame archiving, or the platform
 * kills the function mid-call and the row is stranded in `analyzing`.
 *
 * NOTE: Vercel caps this at 60s on Hobby and 300s on Pro. On Hobby, either move
 * to Pro or set AI_TIMEOUT_MS below ~45000. The stall recovery below means a
 * killed run is recoverable either way rather than stuck forever.
 */
export const maxDuration = 120;

/** An `analyzing` row older than this is presumed dead and may be restarted. */
const STALL_AFTER_MS = 5 * 60 * 1000;

/**
 * The only shape of allowance data the browser is allowed to see.
 *
 * Deliberately omits `reason` (already sent as `error`), `blockedGlobally`,
 * and anything about provider cost, capacity or the global ceiling — a member
 * should never learn our spend posture from a 503.
 */
function publicQuota(state: {
  used: number;
  limit: number;
  remaining: number;
  purchasedRemaining: number;
  totalRemaining: number;
  resetsAt: string;
}) {
  const finite = Number.isFinite(state.limit);
  return {
    used: state.used,
    limit: finite ? state.limit : null,
    remaining: finite ? state.remaining : null,
    purchasedRemaining: state.purchasedRemaining,
    totalRemaining: finite ? state.totalRemaining : null,
    resetsAt: state.resetsAt,
  };
}

interface Body {
  analysisId?: string;
  frames?: { base64?: unknown; mediaType?: unknown; timestampMs?: unknown }[];
}

/**
 * STEP 2 of the upload flow — runs the actual analysis.
 *
 * Called after the browser has PUT the video to storage and extracted frames
 * from it locally. Frames are graded; the source video stays in storage so it
 * can be replayed, re-analyzed or handed to a coach.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It never writes a score it did not get from the model. If no provider is
 * configured, the model fails, or the response cannot be validated, the
 * analysis is marked needs-review and routed to a human. There is no code path
 * here that fabricates a number to make the report look finished.
 */
export async function POST(req: Request) {
  const started = Date.now();

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!canUse(session, 'ai_shot_analysis')) {
    return NextResponse.json(
      { error: 'AI Shot Analysis requires an active Standard or Premium membership.' },
      { status: 403 }
    );
  }
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Demo mode — connect Supabase and set ANTHROPIC_API_KEY to run a real analysis.' },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const analysisId = typeof body.analysisId === 'string' ? body.analysisId : '';
  if (!analysisId) {
    return NextResponse.json({ error: 'analysisId is required.' }, { status: 400 });
  }

  // ---- frame validation -----------------------------------------------
  // Frames are optional. When absent this is a RETRY: the frames archived on
  // the first attempt are re-read from storage below, so the member never has
  // to upload a 200 MB clip twice to recover from a transient model failure.
  const rawFrames = Array.isArray(body.frames) ? body.frames : [];
  const isRetry = rawFrames.length === 0;

  if (rawFrames.length > MAX_FRAMES) {
    return NextResponse.json({ error: `Too many frames — ${MAX_FRAMES} max.` }, { status: 400 });
  }

  const frames: { base64: string; mediaType: string; timestampMs: number }[] = [];
  for (const f of rawFrames) {
    if (typeof f.base64 !== 'string' || !f.base64) {
      return NextResponse.json({ error: 'Malformed frame payload.' }, { status: 400 });
    }
    if ((f.base64.length * 3) / 4 > MAX_FRAME_BYTES) {
      return NextResponse.json({ error: 'One of the frames is too large.' }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(f.mediaType))) {
      return NextResponse.json({ error: 'Unsupported frame image type.' }, { status: 400 });
    }
    frames.push({
      base64: f.base64,
      mediaType: String(f.mediaType),
      timestampMs: Number(f.timestampMs) || 0,
    });
  }

  const supabase = await createServerClient();

  // RLS scopes this select to rows the caller owns, so a guessed id from
  // another member returns nothing rather than somebody else's analysis.
  const { data: analysis, error: loadError } = await supabase
    .from('shot_analyses')
    .select(
      'id, profile_id, shot_type, angle, player_notes, video_path, video_bucket, video_original_name, status, frame_paths, analyzed_at, created_at'
    )
    .eq('id', analysisId)
    .single();

  if (loadError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }
  if (analysis.profile_id !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Not your analysis.' }, { status: 403 });
  }
  if (analysis.status === 'analyzed') {
    return NextResponse.json({ error: 'That analysis has already been run.' }, { status: 409 });
  }

  // ---- concurrency guard ----------------------------------------------
  // Two tabs, a double-click, or an impatient retry must not run the model
  // twice on the same clip — that bills two API calls and races two writes
  // into the same row. A run that has been sitting in `analyzing` for longer
  // than the stall window is treated as dead (the serverless function was
  // almost certainly killed) and may be restarted.
  // `analyzed_at` is stamped when a run STARTS as well as when it finishes, so
  // it doubles as a heartbeat. `shot_analyses` has no `updated_at` column and
  // adding one purely for this would not justify a migration.
  if (analysis.status === 'analyzing') {
    const startedAt = new Date(analysis.analyzed_at ?? analysis.created_at).getTime();
    const runningMs = Date.now() - startedAt;
    if (Number.isFinite(startedAt) && runningMs < STALL_AFTER_MS) {
      return NextResponse.json(
        {
          error: 'This clip is already being analyzed. Give it a moment.',
          status: 'analyzing',
        },
        { status: 409 }
      );
    }
  }

  // ---- 5-SECOND LIMIT: verified from the FILE, before anything is spent ----
  //
  // Runs after the object is confirmed in storage and BEFORE the entitlement
  // reservation and BEFORE any provider call. The duration is read out of the
  // container header server-side (lib/ai/duration.ts) — the client's
  // `durationSec` is never consulted, so editing frontend JavaScript, POSTing
  // a forged number, or calling this API directly all fail identically.
  //
  // This also covers the RETRY path: a retry re-enters this same route and is
  // re-verified against the same stored file, so an over-length clip cannot be
  // smuggled in by retrying or by reusing archived frames.
  //
  // A rejection here costs the member nothing: no reservation exists yet, so
  // no weekly allowance, free credit or paid credit is consumed, and neither
  // Anthropic nor OpenAI is contacted.
  const durationCheck = await verifyStoredDuration(
    supabase,
    analysis.video_bucket ?? 'member-videos',
    analysis.video_path as string
  );

  if (!durationCheck.ok) {
    const message = durationErrorMessage(durationCheck);
    await supabase
      .from('shot_analyses')
      .update({ status: 'failed', error_message: message })
      .eq('id', analysisId);

    console.warn(
      `[analysis] ${analysisId} refused: ${durationCheck.reason}` +
        (durationCheck.reason === 'too_long' ? ` (${durationCheck.seconds.toFixed(2)}s)` : '')
    );
    return NextResponse.json({ error: message, reason: durationCheck.reason }, { status: 400 });
  }

  // Authoritative duration, overwriting whatever the client claimed at upload.
  await supabase
    .from('shot_analyses')
    .update({ duration_sec: durationCheck.seconds })
    .eq('id', analysisId);

  const admin = await createAdminClient();

  // The allowance window is anchored to when the ACCOUNT was created, so each
  // member resets on their own weekday. shot_analyses has no such column, so
  // it is read from profiles here.
  const { data: profileRow } = await admin
    .from('profiles')
    .select('created_at')
    .eq('id', session.userId)
    .single();

  // ---- weekly allowance ------------------------------------------------
  // Atomically claims one analysis from this week's allowance BEFORE any
  // provider work. Server-side and non-negotiable: neither a crafted API call
  // nor anything the browser does can bypass it, because the count comes from
  // `ai_usage`, which members have no write access to under RLS.
  //
  // Also enforces the two global controls (kill switch, spend ceiling), which
  // refuse before anything is written.
  const reservation = await reserveAnalysis(admin, {
    profileId: session.userId,
    analysisId,
    tier: session.tier,
    isAdmin: session.role === 'admin',
    accountCreatedAt: (profileRow?.created_at as string | undefined) ?? null,
  });

  if (!reservation.ok) {
    const { state } = reservation;
    return NextResponse.json(
      { error: state.reason, quota: publicQuota(state) },
      { status: state.blockedGlobally ? 503 : 429 }
    );
  }
  const reservationId = reservation.reservation.id;

  // ---- the video must genuinely be in storage --------------------------
  const upload = await verifyUpload(
    supabase,
    analysis.profile_id,
    analysisId,
    analysis.video_original_name ?? 'clip.mp4'
  );
  if (!upload.ok) {
    await supabase
      .from('shot_analyses')
      .update({ status: 'failed', error_message: upload.error })
      .eq('id', analysisId);
    // Nothing reached the provider, so this must not cost an analysis.
    await releaseReservation(admin, reservationId, 'video missing from storage');
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  // ---- resolve the frames to grade -------------------------------------
  // Fresh run: archive what the browser extracted so a retry is possible.
  // Retry: read those archived frames back. Either way the model only ever
  // sees frames that came from this member's uploaded video.
  let framePaths: string[] = Array.isArray(analysis.frame_paths) ? analysis.frame_paths : [];

  if (isRetry) {
    const restored = await loadFrames(supabase, framePaths);
    if (!restored.length) {
      const message =
        'This analysis cannot be retried automatically because its frames are no longer stored. Upload the clip again to run a fresh analysis.';
      await supabase
        .from('shot_analyses')
        .update({ status: 'in_review', requested_review: true, error_message: message })
        .eq('id', analysisId);
      await releaseReservation(admin, reservationId, 'no archived frames to retry from');
      return NextResponse.json({ error: message, status: 'in_review' }, { status: 409 });
    }
    frames.push(...restored);
  } else {
    const stored = await storeFrames(supabase, analysis.profile_id, analysisId, frames);
    if (stored.length) framePaths = stored;
  }

  await supabase
    .from('shot_analyses')
    .update({
      status: 'analyzing',
      video_bytes: upload.bytes,
      frame_count: frames.length,
      frame_paths: framePaths,
      error_message: null,
      // Heartbeat — see the stall check above. Overwritten with the real
      // completion time on success.
      analyzed_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  // ---- no provider key: human review, never invented scores ------------
  if (!analyzerConfigured()) {
    const message =
      'Automated analysis is not enabled on this deployment. Your clip has been sent to a coach for manual review.';
    await supabase
      .from('shot_analyses')
      .update({ status: 'in_review', requested_review: true, error_message: message })
      .eq('id', analysisId);

    await releaseReservation(admin, reservationId, 'no AI provider configured');
    return NextResponse.json({ id: analysisId, status: 'in_review', message }, { status: 202 });
  }

  // ---- run it ---------------------------------------------------------
  try {
    // At most two model calls: the normal structured attempt, then one
    // stricter correction if the first came back unreadable. Everything below
    // this line runs exactly once regardless of which attempt succeeded, so a
    // repaired analysis cannot double-write usage, metrics or entitlement.
    const { result, attempts, repaired, usage } = await analyzeShotWithRepair({
      frames,
      shotType: isShotType(analysis.shot_type) ? analysis.shot_type : 'wrist',
      angle: isCameraAngle(analysis.angle) ? analysis.angle : 'side',
      playerNotes: analysis.player_notes ?? undefined,
    });

    if (repaired) {
      console.warn(`[analysis] ${analysisId} succeeded on attempt ${attempts} after a format retry.`);
    }

    const processingMs = Date.now() - started;

    const { error: updateError } = await supabase
      .from('shot_analyses')
      .update({
        status: 'analyzed',
        overall_score: result.overallScore,
        category_scores: result.categories,
        strengths: result.strengths,
        improvement_areas: result.improvementAreas,
        recommendations: result.recommendations,
        summary: result.summary,
        confidence: result.confidence,
        footage_issues: result.footageIssues,
        graded_count: result.gradedCount,
        model: result.model,
        processing_ms: processingMs,
        analyzed_at: result.analyzedAt,
        error_message: null,
      })
      .eq('id', analysisId);

    if (updateError) throw new Error(updateError.message);

    // Commits the SINGLE reservation taken above. An automatic repair retry
    // makes two provider attempts inside this one reservation, so it still
    // consumes exactly one analysis from the weekly allowance.
    await commitReservation(admin, reservationId, {
      model: result.model,
      frameCount: frames.length,
      succeeded: true,
      // Token usage for every provider call this entitlement made.
      usage,
    });

    // Feed the score into progress tracking so trends build automatically —
    // but only when something was actually gradeable.
    if (result.overallScore !== null) {
      await supabase.from('metrics').insert({
        profile_id: session.userId,
        kind: 'analysis_score',
        value: result.overallScore,
        unit: 'pts',
        source: 'ai_analysis',
      });
    }

    return NextResponse.json({ id: analysisId, status: 'analyzed', result });
  } catch (err) {
    const isConfig = err instanceof AnalyzerNotConfiguredError;
    const isBadOutput = err instanceof ModelOutputError;

    // The member sees plain language and a route forward. Parser positions,
    // stack traces, provider payloads and schema internals stay in the server
    // log — they are meaningless to a parent and look like a broken product.
    const message = isConfig
      ? 'Automated analysis is not enabled on this deployment. Your clip has been sent to a coach for manual review.'
      : isBadOutput
        ? 'The automated analysis could not be completed reliably, so nothing was scored — we will not show you a made-up result. Your clip and its frames are saved, so you can run it again, and a coach can review it either way.'
        : 'The automated analysis could not be completed. Your clip has been kept and sent to a coach for review, and you can try running it again.';

    // Full detail, server-side only.
    console.error(
      `[analysis] ${analysisId} failed after ${Date.now() - started}ms:`,
      (err as Error).name,
      (err as Error).message
    );

    // Failure preserves the video and routes to a human. It never writes scores.
    await supabase
      .from('shot_analyses')
      .update({
        status: 'in_review',
        requested_review: true,
        error_message: message,
        processing_ms: Date.now() - started,
      })
      .eq('id', analysisId);

    // A failure BEFORE the provider was contacted costs nothing, so it must
    // not cost the player an analysis. A failure after the call was made does
    // consume it — those tokens were spent.
    if (isConfig) {
      await releaseReservation(admin, reservationId, 'no AI provider configured');
    } else {
      // A failed call still burned tokens, so its cost is still recorded.
      await commitReservation(admin, reservationId, {
        model: configuredModel(),
        frameCount: frames.length,
        succeeded: false,
        usage: takeFailedUsage(),
      });
    }

    return NextResponse.json({ id: analysisId, status: 'in_review', error: message }, { status: 502 });
  }
}
