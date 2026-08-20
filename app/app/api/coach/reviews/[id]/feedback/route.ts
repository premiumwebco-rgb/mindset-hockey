import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Persists a coach's written review for a video submission.
 *
 * Writes to `submission_feedback` (migration 0002) — the table the previous
 * ReviewEditor never called at all; `publish()` only did `setPublished(true)`
 * on local component state, so nothing survived a page refresh and a member
 * never actually received anything.
 *
 * `complete: false` lets a coach save a draft mid-review (status moves to
 * 'in_review', still visible in the queue as being worked on).
 * `complete: true` publishes it (status moves to 'reviewed', reviewed_at and
 * reviewer_id are stamped) — this is the point a member can see it on
 * /reviews/[id].
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { body?: string; complete?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = (body.body ?? '').trim().slice(0, 8000);
  if (!text) return NextResponse.json({ error: 'Write a summary before saving.' }, { status: 400 });

  const complete = Boolean(body.complete);

  const supabase = await createServerClient();

  // vsub_staff_all confirms this coach can see the submission at all before
  // feedback is attached to it.
  const { data: submission } = await supabase
    .from('video_submissions')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  // sfeedback_staff_write (migration 0002) is the real authorization here.
  const { error: feedbackError } = await supabase.from('submission_feedback').insert({
    submission_id: id,
    reviewer_id: session.userId,
    body: text,
    complete,
  });

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from('video_submissions')
    .update({
      status: complete ? 'reviewed' : 'in_review',
      reviewed_at: complete ? new Date().toISOString() : null,
      reviewer_id: session.userId,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true, complete });
}
