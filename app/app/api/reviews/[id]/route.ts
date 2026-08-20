import { NextResponse } from 'next/server';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { verifySubmissionUpload } from '@/lib/reviews-storage';

export const runtime = 'nodejs';

/**
 * STEP 2 of the video review upload flow.
 *
 * Called once the browser's direct PUT to storage (against the signed URL
 * from POST /api/reviews) has finished. Confirms the object actually landed
 * before moving the submission out of 'uploading' — an interrupted or failed
 * browser upload must not silently surface in /coach/queue with nothing
 * behind it.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireFeature('video_review');
  const { id } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fileName = (body.fileName ?? '').trim();
  if (!fileName) return NextResponse.json({ error: 'A file name is required.' }, { status: 400 });

  const supabase = await createServerClient();

  // RLS (vsub_own_read) already scopes this to the caller's own submission —
  // a stranger's id here returns nothing rather than someone else's row.
  const { data: submission } = await supabase
    .from('video_submissions')
    .select('id, profile_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!submission || submission.profile_id !== session.userId) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  const verify = await verifySubmissionUpload(supabase, session.userId, id, fileName);
  if (!verify.ok) {
    await supabase.from('video_submissions').update({ status: 'failed' }).eq('id', id);
    return NextResponse.json({ error: verify.error }, { status: 422 });
  }

  const { error: updateError } = await supabase
    .from('video_submissions')
    .update({ status: 'queued' })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
