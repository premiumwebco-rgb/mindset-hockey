import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ==========================================================================
   MINDSET LESSON VIDEO UPLOAD  —  ADMIN ONLY

   Reuses the existing private 'training-resources' storage bucket (0008)
   under a mindset-videos/ prefix — no new bucket, no new storage policy.
   Same pattern as api/admin/mindset/thumbnail and api/admin/resources: the
   browser PUTs the file straight to a signed URL, so a full-length lesson
   video never has to fit inside a serverless request body.

   video_url on mindset_lessons (added 0015) previously held a pasted
   external URL. It now holds this bucket's storage path instead — the
   column name is unchanged (no migration needed), only what the admin UI
   writes into it changes. Reads resolve it to a short-lived signed URL,
   same as every other private asset in this app.
   ========================================================================== */

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — a full lesson, same cap as training resources.

export async function POST(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode — connect Supabase first.' }, { status: 503 });

  let body: { fileName?: string; fileType?: string; fileSize?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const fileType = body.fileType ?? '';
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Video must be MP4, MOV or WebM.' }, { status: 400 });
  }
  if (typeof body.fileSize !== 'number' || body.fileSize <= 0) {
    return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });
  }
  if (body.fileSize > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 400 }
    );
  }

  const ext = fileType === 'video/webm' ? 'webm' : fileType === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `mindset-videos/${crypto.randomUUID()}.${ext}`;

  const supabase = await createServerClient();
  const { data: signed, error } = await supabase.storage
    .from('training-resources')
    .createSignedUploadUrl(path);

  if (error || !signed) {
    console.error('[mindset-video] signed url failed:', error?.message);
    return NextResponse.json(
      { error: 'Could not start that upload. Check the training-resources bucket exists.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ path, signedUrl: signed.signedUrl, token: signed.token });
}
