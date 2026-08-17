import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/nutrition-admin';

export const runtime = 'nodejs';

/* ==========================================================================
   MINDSET TRAINING LIBRARY  —  ADMIN ONLY  (Phase 6, Part 6)

   Reuses the existing mindset_lessons table (0002) — extended additively in
   migration 0015 with category/thumbnail_path/video_url/duration_sec — NOT
   a new table. Its RLS write policy (mindset_lessons_admin, 0002) already
   requires auth_is_admin(), matching this route's requireAdmin() gate
   exactly, so no policy change was needed for this feature.

   AUTHORIZATION IS SERVER-SIDE AND DOUBLE-ENFORCED, same convention as every
   other admin CMS route in this codebase (see api/admin/nutrition/recipes).
   ========================================================================== */

const CATEGORIES = [
  'confidence', 'visualization', 'resilience', 'leadership',
  'focus', 'pressure_performance', 'goal_setting', 'mental_recovery',
] as const;

function inCategories(v: unknown): v is (typeof CATEGORIES)[number] {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

function fail(scope: string, error: { message: string } | null, friendly: string, status = 500) {
  console.error(`[mindset-cms] ${scope} failed:`, error?.message);
  return NextResponse.json({ error: friendly }, { status });
}

const LIST_COLUMNS =
  'id, slug, title, summary, category, topic, week, thumbnail_path, video_url, duration_sec, ' +
  'required_tier, is_published, sort_order';

export async function GET() {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ lessons: [] });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('mindset_lessons')
    .select(LIST_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return fail('list', error, 'Could not load mindset lessons.');
  return NextResponse.json({ lessons: data ?? [] });
}

/* --------------------------------------------------------------------------
   POST — create a lesson.
-------------------------------------------------------------------------- */
export async function POST(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode — connect Supabase first.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 3) {
    return NextResponse.json({ error: 'Title must be at least 3 characters.' }, { status: 400 });
  }
  if (body.category !== undefined && body.category !== null && !inCategories(body.category)) {
    return NextResponse.json({ error: 'Choose a valid category.' }, { status: 400 });
  }
  const requiredTier = body.requiredTier === 'basic' ? 'basic' : 'premium';
  const slug = toSlug(typeof body.slug === 'string' && body.slug ? body.slug : title);
  if (slug.length < 3) {
    return NextResponse.json({ error: 'Slug must be at least 3 characters.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  // week is NOT NULL on the existing table (a legacy text-lesson field) —
  // default it to 0 for video lessons rather than force the admin to invent
  // a fake week number, and reuse `topic` for a plain-text fallback if
  // `category` is left blank so no existing reader is ever handed a null.
  const { data: created, error } = await admin
    .from('mindset_lessons')
    .insert({
      slug,
      title,
      summary: typeof body.description === 'string' ? body.description.slice(0, 2000) : null,
      category: body.category ?? null,
      topic: typeof body.category === 'string' ? body.category : 'general',
      week: 0,
      thumbnail_path: typeof body.thumbnailPath === 'string' ? body.thumbnailPath : null,
      video_url: typeof body.videoUrl === 'string' ? body.videoUrl.trim() || null : null,
      duration_sec: Number.isFinite(body.durationSec) ? Math.max(0, Math.round(body.durationSec as number)) : null,
      required_tier: requiredTier,
      is_published: false,
      sort_order: Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder as number) : 0,
    })
    .select('id, slug')
    .single();

  if (error || !created) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken. Choose a different one.' }, { status: 409 });
    }
    return fail('create', error, 'Could not create that lesson.');
  }

  return NextResponse.json({ id: created.id, slug: created.slug });
}

/* --------------------------------------------------------------------------
   PATCH — full edit, publish/unpublish, or a reorder (sort_order only).
-------------------------------------------------------------------------- */
export async function PATCH(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();

  // Quick single-field actions — publish toggle or reorder — without
  // requiring the whole edit form's payload.
  if (typeof body.isPublished === 'boolean' && Object.keys(body).length <= 2) {
    const { error } = await admin.from('mindset_lessons').update({ is_published: body.isPublished }).eq('id', id);
    if (error) return fail('publish', error, 'Could not change that lesson’s status.');
    return NextResponse.json({ ok: true });
  }
  if (typeof body.sortOrder === 'number' && Object.keys(body).length <= 2) {
    const { error } = await admin.from('mindset_lessons').update({ sort_order: Math.round(body.sortOrder) }).eq('id', id);
    if (error) return fail('reorder', error, 'Could not reorder that lesson.');
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim().length >= 3) patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.summary = body.description.slice(0, 2000);
  if (body.category === null || inCategories(body.category)) {
    patch.category = body.category;
    if (typeof body.category === 'string') patch.topic = body.category;
  }
  if (typeof body.videoUrl === 'string') patch.video_url = body.videoUrl.trim() || null;
  if (typeof body.thumbnailPath === 'string' || body.thumbnailPath === null) patch.thumbnail_path = body.thumbnailPath;
  if (Number.isFinite(body.durationSec)) patch.duration_sec = Math.max(0, Math.round(body.durationSec as number));
  if (body.requiredTier === 'basic' || body.requiredTier === 'premium') patch.required_tier = body.requiredTier;
  if (typeof body.slug === 'string' && body.slug.trim()) patch.slug = toSlug(body.slug);
  if (Number.isFinite(body.sortOrder)) patch.sort_order = Math.round(body.sortOrder as number);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await admin.from('mindset_lessons').update(patch).eq('id', id);
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken. Choose a different one.' }, { status: 409 });
    }
    return fail('update', error, 'Could not save that lesson.');
  }

  return NextResponse.json({ ok: true });
}

/* --------------------------------------------------------------------------
   DELETE — mindset_lessons has no draft/archive status column (unlike
   nutrition), so this is a real delete. mindset_progress rows referencing a
   deleted lesson cascade (ON DELETE CASCADE, 0002) — a member's completion
   history for a removed lesson goes with it, same as removing any other
   piece of content.
-------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('mindset_lessons').delete().eq('id', id);
  if (error) return fail('delete', error, 'Could not delete that lesson.');

  return NextResponse.json({ ok: true, deleted: true });
}
