import { NextResponse } from 'next/server';
import { getSession, canUse, DEMO_MODE } from '@/lib/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { analyzeShot, analyzerConfigured, configuredModel, AnalyzerNotConfiguredError } from '@/lib/ai/analyzer';
import { ModelOutputError } from '@/lib/ai/schema';
import { verifyUpload } from '@/lib/ai/storage';
import { checkQuota, recordUsage } from '@/lib/ai/quota';
import { MAX_FRAMES, MAX_FRAME_BYTES, isShotType, isCameraAngle } from '@/lib/ai/config';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface Body {
  analysisId?: string;
  frames?: { base64?: unknown; mediaType?: unknown; timestampMs?: unknown }[];
}

/**
 * STEP 2 of the upload flow — runs the actual analysis.
 *
 * Called after the browser has PUT the video to storage and extracted frames
 * from it locally. Frames are graded; the source video stays in storage so it
 * can be replayed, re-analysed or handed to a coach.
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
  const rawFrames = Array.isArray(body.frames) ? body.frames : [];
  if (!rawFrames.length) {
    return NextResponse.json({ error: 'No frames were supplied.' }, { status: 400 });
  }
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
    .select('id, profile_id, shot_type, angle, player_notes, video_path, video_original_name, status')
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

  const admin = await createAdminClient();

  // ---- quota ----------------------------------------------------------
  const quota = await checkQuota(admin, session.userId, session.role === 'admin');
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason, quota }, { status: 429 });
  }

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
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  await supabase
    .from('shot_analyses')
    .update({ status: 'analyzing', video_bytes: upload.bytes, frame_count: frames.length })
    .eq('id', analysisId);

  // ---- no provider key: human review, never invented scores ------------
  if (!analyzerConfigured()) {
    const message =
      'Automated analysis is not enabled on this deployment. Your clip has been sent to a coach for manual review.';
    await supabase
      .from('shot_analyses')
      .update({ status: 'in_review', requested_review: true, error_message: message })
      .eq('id', analysisId);

    return NextResponse.json({ id: analysisId, status: 'in_review', message }, { status: 202 });
  }

  // ---- run it ---------------------------------------------------------
  try {
    const result = await analyzeShot({
      frames,
      shotType: isShotType(analysis.shot_type) ? analysis.shot_type : 'wrist',
      angle: isCameraAngle(analysis.angle) ? analysis.angle : 'side',
      playerNotes: analysis.player_notes ?? undefined,
    });

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

    await recordUsage(admin, {
      profileId: session.userId,
      analysisId,
      model: result.model,
      frameCount: frames.length,
      succeeded: true,
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

    const message = isConfig
      ? err.message
      : isBadOutput
        ? `The analysis could not be read back reliably (${err.message}). Nothing was scored — your clip has been kept and sent for coach review.`
        : `Analysis failed: ${(err as Error).message}`;

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

    await recordUsage(admin, {
      profileId: session.userId,
      analysisId,
      model: configuredModel(),
      frameCount: frames.length,
      succeeded: false,
    });

    console.error('[analysis]', message);
    return NextResponse.json({ id: analysisId, status: 'in_review', error: message }, { status: 502 });
  }
}
