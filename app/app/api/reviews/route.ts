import { NextResponse } from 'next/server';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { buildSubmissionPath, createSubmissionUploadUrl } from '@/lib/reviews-storage';
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_BYTES } from '@/lib/video';

export const runtime = 'nodejs';

/**
 * STEP 1 of the video review upload flow — mirrors app/api/analysis/upload/route.ts.
 *
 * Creates the video_submissions row, then hands back a signed URL the browser
 * PUTs the video straight to (see lib/reviews-storage.ts). The file never
 * passes through this server. The destination path is derived here from the
 * session user id, so a caller cannot aim the upload at somebody else's
 * folder.
 *
 * Previously this handler wrote `video_path: body.fileName` — a bare client-
 * supplied string — and never touched storage at all, so nothing was ever
 * actually uploaded. This replaces that with the same signed-upload pattern
 * used by AI Shot Analysis. See app/api/reviews/[id]/route.ts for step 2.
 */
export async function POST(req: Request) {
  const session = await requireFeature('video_review');

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: {
    title?: string;
    kind?: string;
    notes?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = (body.title ?? '').trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const kind = ['game', 'practice', 'training'].includes(body.kind ?? '') ? body.kind! : 'game';

  const fileName = (body.fileName ?? '').trim();
  if (!fileName) {
    return NextResponse.json({ error: 'A file name is required.' }, { status: 400 });
  }

  const typeOk =
    (typeof body.fileType === 'string' && (ACCEPTED_VIDEO_TYPES as string[]).includes(body.fileType)) ||
    /\.(mp4|mov|webm)$/i.test(fileName);
  if (!typeOk) {
    return NextResponse.json({ error: 'Use an MP4, MOV or WEBM file.' }, { status: 400 });
  }

  const size = Number(body.fileSize ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });
  }
  if (size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `That file is over ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB. Trim the clip.` },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  // A `players` row may not exist yet — it's created during onboarding, which
  // a member can skip or complete later. video_submissions.player_id is
  // nullable specifically to avoid gating a submission on that: /coach/queue
  // reads profile_id, not player_id, for exactly this reason.
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .maybeSingle();

  // Create the row first so a half-finished upload is still visible to the
  // member rather than vanishing silently.
  const { data: created, error: insertError } = await supabase
    .from('video_submissions')
    .insert({
      profile_id: session.userId,
      player_id: player?.id ?? null,
      title,
      kind,
      notes: (body.notes ?? '').slice(0, 2000) || null,
      status: 'uploading',
      // Premium SLA: feedback back inside 72 hours.
      sla_due_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
    })
    .select('id')
    .single();

  // An RLS denial surfaces here — the caller is not actually entitled
  // (vsub_own_insert requires profile_id = auth.uid() AND premium tier),
  // whatever the checks above concluded.
  if (insertError || !created) {
    if (insertError) console.error('[reviews] insert denied:', insertError.message);
    return NextResponse.json(
      { error: 'Could not start the submission. Check your membership is active.' },
      { status: 403 }
    );
  }

  const submissionId = created.id as string;
  const path = buildSubmissionPath(session.userId, submissionId, fileName);

  const signed = await createSubmissionUploadUrl(supabase, path);
  if ('error' in signed) {
    await supabase.from('video_submissions').update({ status: 'failed' }).eq('id', submissionId);
    return NextResponse.json({ error: signed.error }, { status: 500 });
  }

  await supabase.from('video_submissions').update({ video_path: path }).eq('id', submissionId);

  return NextResponse.json({
    id: submissionId,
    path,
    fileName,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}
