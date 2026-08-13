import { NextResponse } from 'next/server';
import { getSession, canUse, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { buildVideoPath, createUploadUrl } from '@/lib/ai/storage';
import {
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_BYTES,
  isShotType,
  isCameraAngle,
} from '@/lib/ai/config';

export const runtime = 'nodejs';

/**
 * STEP 1 of the upload flow.
 *
 * Creates the analysis row, then hands back a signed URL the browser PUTs the
 * video straight to. The file never passes through this server — a 200 MB body
 * would exceed serverless limits — but the destination path is derived here
 * from the session user id, so a caller cannot aim the upload at somebody
 * else's folder.
 *
 * Authorisation is checked three times over: here, by the RLS insert policy on
 * shot_analyses, and by the storage RLS policy on the object write. This
 * handler returning 403 is a convenience; the database is the real boundary.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!canUse(session, 'ai_shot_analysis')) {
    return NextResponse.json(
      { error: 'AI Shot Analysis requires an active Standard or Premium membership.' },
      { status: 403 }
    );
  }

  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Demo mode — connect Supabase to upload and analyse real video.' },
      { status: 503 }
    );
  }

  let body: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    shotType?: string;
    angle?: string;
    playerNotes?: string;
    durationSec?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const fileName = (body.fileName ?? '').trim();
  if (!fileName) {
    return NextResponse.json({ error: 'A file name is required.' }, { status: 400 });
  }

  const typeOk =
    (typeof body.fileType === 'string' &&
      (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(body.fileType)) ||
    ACCEPTED_VIDEO_EXTENSIONS.test(fileName);
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

  const shotType = isShotType(body.shotType) ? body.shotType : 'wrist';
  const angle = isCameraAngle(body.angle) ? body.angle : 'side';
  const duration = Number(body.durationSec);

  const supabase = await createServerClient();

  // Create the row first so a half-finished upload is still visible to the
  // member rather than vanishing silently.
  const { data: created, error: insertError } = await supabase
    .from('shot_analyses')
    .insert({
      profile_id: session.userId,
      shot_type: shotType,
      angle,
      player_notes: (body.playerNotes ?? '').slice(0, 2000) || null,
      status: 'uploading',
      video_bucket: 'member-videos',
      video_original_name: fileName.slice(0, 200),
      video_mime: body.fileType ?? null,
      video_bytes: size,
      duration_sec: Number.isFinite(duration) && duration > 0 ? duration : null,
    })
    .select('id')
    .single();

  // An RLS denial surfaces here — the caller is not actually entitled, whatever
  // the checks above concluded.
  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Could not start the analysis.' },
      { status: 403 }
    );
  }

  const analysisId = created.id as string;
  const path = buildVideoPath(session.userId, analysisId, fileName);

  const signed = await createUploadUrl(supabase, path);
  if ('error' in signed) {
    await supabase
      .from('shot_analyses')
      .update({ status: 'failed', error_message: signed.error })
      .eq('id', analysisId);
    return NextResponse.json({ error: signed.error }, { status: 500 });
  }

  await supabase.from('shot_analyses').update({ video_path: path }).eq('id', analysisId);

  return NextResponse.json({
    analysisId,
    path,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}
