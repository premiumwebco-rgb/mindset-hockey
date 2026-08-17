import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ==========================================================================
   MINDSET LESSON COVER PHOTO UPLOAD  —  ADMIN ONLY

   Reuses the existing private 'training-resources' storage bucket (0008)
   under a mindset-covers/ prefix — no new bucket, no new storage policy.
   That bucket's existing policies are scoped by bucket_id only (not path
   prefix), so a cover image uploaded here is already covered by:
     - training_resources_staff_write / _update  (insert/update, auth_is_staff())
     - training_resources_member_read            (any entitled member or staff)

   Same signed-URL-from-the-browser pattern as api/admin/resources: the file
   never passes through the Next.js server, so a several-MB photo upload
   never risks a serverless body-size limit.
   ========================================================================== */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a cover photo, not a video.

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
    return NextResponse.json({ error: 'Cover photo must be JPEG, PNG or WebP.' }, { status: 400 });
  }
  if (typeof body.fileSize !== 'number' || body.fileSize <= 0 || body.fileSize > MAX_BYTES) {
    return NextResponse.json({ error: 'Cover photo must be under 10 MB.' }, { status: 400 });
  }

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg';
  const path = `mindset-covers/${crypto.randomUUID()}.${ext}`;

  const supabase = await createServerClient();
  const { data: signed, error } = await supabase.storage
    .from('training-resources')
    .createSignedUploadUrl(path);

  if (error || !signed) {
    console.error('[mindset-thumbnail] signed url failed:', error?.message);
    return NextResponse.json(
      { error: 'Could not start that upload. Check the training-resources bucket exists.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ path, signedUrl: signed.signedUrl, token: signed.token });
}
