import { NextResponse } from 'next/server';
import { requireFeature, hasTier, DEMO_MODE } from '@/lib/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { Tier } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Marks (or unmarks) a mindset lesson complete for the signed-in member.
 *
 * Writes to `mindset_progress` (migration 0002) — the same table
 * getMindsetLessons() already reads to compute each lesson's `completed`
 * flag on /mindset. That table existed and was already read; nothing wrote
 * to it. This is the write side, not a new progress system.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireFeature('mindset_training');
  const { slug } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { completed?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const completed = body.completed !== false;

  // Read via the admin client so a locked/unpublished lesson can be told
  // apart from one that doesn't exist — same reasoning as
  // getMindsetLessonForViewing() in lib/data.ts.
  const admin = await createAdminClient();
  const { data: lesson } = await admin
    .from('mindset_lessons')
    .select('id, is_published, required_tier')
    .eq('slug', slug)
    .maybeSingle();

  if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });

  const staff = session.role === 'admin' || session.role === 'coach';
  if (!lesson.is_published && !staff) {
    return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
  }

  const requiredTier = (lesson.required_tier as Tier) ?? 'premium';
  if (!hasTier(session, requiredTier)) {
    return NextResponse.json({ error: 'This lesson requires a higher membership tier.' }, { status: 403 });
  }

  const supabase = await createServerClient();

  // mindset_progress_own (0002) requires profile_id = auth.uid() AND
  // auth_has_tier('premium') to write — the real authorization boundary.
  const { error } = await supabase.from('mindset_progress').upsert(
    {
      profile_id: session.userId,
      lesson_id: lesson.id,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'profile_id,lesson_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true, completed });
}
