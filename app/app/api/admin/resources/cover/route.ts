import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ==========================================================================
   TRAINING RESOURCE COVER IMAGE UPLOAD  —  STAFF ONLY

   Reuses the existing private 'training-resources' storage bucket (0008)
   under a cover-images/ prefix — no new bucket, no new storage policy. That
   bucket's policies are scoped by bucket_id only (not path prefix), so a
   cover image uploaded here is already covered by:
     - training_resources_staff_write / _update  (insert/update, auth_is_staff())
     - training_resources_member_read            (any entitled member or staff)

   Same signed-URL-from-the-browser pattern as api/admin/resources and
   api/admin/mindset/thumbnail: the file never passes through the Next.js
   server.
   ========================================================================== */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a cover photo, not the resource file itself.

export async function POST(req: Request) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode — connect Supabase first.' }, { status: 503 });

  let body: { fileName?: string; fileType?: string; fileSize?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const fileType = body.fileType ?? '';
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Cover image must be JPG, PNG or WEBP.' }, { status: 400 });
  }
  if (typeof body.fileSize !== 'number' || body.fileSize <= 0 || body.fileSize > MAX_BYTES) {
    return NextResponse.json({ error: 'Cover image must be under 10 MB.' }, { status: 400 });
  }

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg';
  const path = `cover-images/${crypto.randomUUID()}.${ext}`;

  const supabase = await createServerClient();
  const { data: signed, error } = await supabase.storage
    .from('training-resources')
    .createSignedUploadUrl(path);

  if (error || !signed) {
    console.error('[resource-cover] signed url failed:', error?.message);
    return NextResponse.json(
      { error: 'Could not start that upload. Check the training-resources bucket exists.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ path, signedUrl: signed.signedUrl, token: signed.token });
}
