import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { isAssignmentContentType, contentTypeRequiresContentId } from '@/lib/assignments';

export const runtime = 'nodejs';

/**
 * Creates one assignment — a coach/admin pointing existing content at one
 * player. assignments_staff_insert (migration 0017) is the real
 * authorization; requireStaff() is the app-layer gate in front of it.
 *
 * No new completion tracking is created here — only the assignment row
 * itself. Completion is always derived later, at read time, from
 * mindset_progress / workout_completions / video_submissions / shot_analyses
 * (see lib/assignments.ts).
 */
export async function POST(req: Request) {
  const session = await requireStaff();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { profileId?: string; contentType?: string; contentId?: string; dueAt?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const profileId = (body.profileId ?? '').trim();
  if (!profileId) return NextResponse.json({ error: 'Select a player.' }, { status: 400 });

  if (!isAssignmentContentType(body.contentType)) {
    return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
  }
  const contentType = body.contentType;

  const contentId = (body.contentId ?? '').trim() || null;
  if (contentTypeRequiresContentId(contentType) && !contentId) {
    return NextResponse.json({ error: 'Select content to assign.' }, { status: 400 });
  }
  if (!contentTypeRequiresContentId(contentType) && contentId) {
    return NextResponse.json({ error: 'This assignment type has no specific content to select.' }, { status: 400 });
  }

  let dueAt: string | null = null;
  if (body.dueAt) {
    const parsed = new Date(body.dueAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
    }
    dueAt = parsed.toISOString();
  }

  const note = (body.note ?? '').trim().slice(0, 2000) || null;

  const supabase = await createServerClient();
  const { error } = await supabase.from('assignments').insert({
    profile_id: profileId,
    assigned_by: session.userId,
    content_type: contentType,
    content_id: contentId,
    due_at: dueAt,
    note,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
