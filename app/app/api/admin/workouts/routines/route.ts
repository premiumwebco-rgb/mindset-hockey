import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/nutrition-admin';
import { ROUTINE_OCCASIONS, ROUTINE_DIFFICULTIES } from '@/lib/data';

export const runtime = 'nodejs';

/* ==========================================================================
   WORKOUT ROUTINES  —  ADMIN CMS

   Reuses the existing workout_plans / workout_sessions tables (0002) that
   already power getWorkoutRoutines() / getWorkoutRoutineBySlug() in
   lib/data.ts and the player-facing /workouts pages — no new tables. A
   "routine" here is exactly what the player side already reads: a
   workout_plans row with phase='routine', joined to its one workout_sessions
   row (week=1, day=1) whose `blocks` jsonb holds difficulty/whenToUse/
   coachTip/equipment/sections. This mirrors the shape the seed data
   (supabase/seed/workout_routines.sql) already writes by hand, just through
   an admin UI instead of SQL.

   AUTHORIZATION IS SERVER-SIDE AND DOUBLE-ENFORCED. requireAdmin() reads
   profiles.role from the authenticated session. Beneath it, the 0002 RLS
   policies workout_plans_admin / workout_sessions_admin both require
   auth_is_admin() to write — stricter than nutrition's staff-level policy —
   so this route uses requireAdmin(), not requireStaff(), to match.

   DELETE IS REAL. workout_plans has no draft/archive status column (only
   is_published), same as mindset_lessons — so DELETE removes the plan row.
   Its one workout_sessions row cascades (ON DELETE CASCADE, 0002), and any
   workout_completions logged against that session cascade with it.
   ========================================================================== */

const LIST_COLUMNS =
  'id, slug, title, description, focus, required_tier, is_published, sort_order, ' +
  'workout_sessions(id, duration_min, blocks)';

function fail(scope: string, error: { message: string } | null, friendly: string, status = 500) {
  console.error(`[workout-cms] ${scope} failed:`, error?.message);
  return NextResponse.json({ error: friendly }, { status });
}

function inList<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

interface ExerciseInput {
  name?: unknown;
  duration?: unknown;
  sets?: unknown;
  reps?: unknown;
  rest?: unknown;
  instructions?: unknown;
}

interface SectionInput {
  name?: unknown;
  items?: unknown;
}

/** Validates and cleans the sections/exercises tree — the same shape
 *  RoutineSection[] expects on the read side (lib/data.ts parseRoutineBlocks). */
function parseSections(raw: unknown): { ok: true; value: unknown[] } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'Sections must be a list.' };

  const sections: unknown[] = [];
  for (const s of raw as SectionInput[]) {
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    if (!name) continue; // skip empty rows the editor may leave behind
    const items = Array.isArray(s.items) ? (s.items as ExerciseInput[]) : [];
    const cleanItems = items
      .map((it) => {
        const itemName = typeof it.name === 'string' ? it.name.trim() : '';
        if (!itemName) return null;
        const exercise: Record<string, unknown> = {
          name: itemName,
          instructions: typeof it.instructions === 'string' ? it.instructions.trim() : '',
        };
        if (typeof it.duration === 'string' && it.duration.trim()) exercise.duration = it.duration.trim();
        if (typeof it.reps === 'string' && it.reps.trim()) exercise.reps = it.reps.trim();
        if (typeof it.rest === 'string' && it.rest.trim()) exercise.rest = it.rest.trim();
        if (Number.isFinite(it.sets)) exercise.sets = Math.round(it.sets as number);
        return exercise;
      })
      .filter((x): x is Record<string, unknown> => x !== null);
    sections.push({ name, items: cleanItems });
  }
  return { ok: true, value: sections };
}

/** Builds the workout_sessions.blocks jsonb payload from the admin form body. */
function buildBlocks(body: Record<string, unknown>): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const difficulty = body.difficulty;
  if (difficulty !== undefined && difficulty !== null && !inList(ROUTINE_DIFFICULTIES, difficulty)) {
    return { ok: false, error: 'Choose a valid difficulty.' };
  }
  const sections = parseSections(body.sections);
  if (!sections.ok) return sections;

  const equipment = Array.isArray(body.equipment)
    ? (body.equipment as unknown[]).filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    : [];

  return {
    ok: true,
    value: {
      difficulty: difficulty ?? null,
      whenToUse: typeof body.whenToUse === 'string' ? body.whenToUse.trim() : '',
      coachTip: typeof body.coachTip === 'string' ? body.coachTip.trim() : '',
      equipment,
      sections: sections.value,
    },
  };
}

/* --------------------------------------------------------------------------
   GET — list every routine (any published state) for the admin console.
-------------------------------------------------------------------------- */
export async function GET() {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ routines: [] });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('workout_plans')
    .select(LIST_COLUMNS)
    .eq('phase', 'routine')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return fail('list', error, 'Could not load workout routines.');
  return NextResponse.json({ routines: data ?? [] });
}

/* --------------------------------------------------------------------------
   POST — create a routine (a plan row + its one session row).
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
  if (!inList(ROUTINE_OCCASIONS, body.occasion)) {
    return NextResponse.json({ error: 'Choose a valid occasion/category.' }, { status: 400 });
  }
  const requiredTier = body.requiredTier === 'premium' ? 'premium' : 'basic';
  const slug = toSlug(typeof body.slug === 'string' && body.slug ? body.slug : title);
  if (slug.length < 3) {
    return NextResponse.json({ error: 'Slug must be at least 3 characters.' }, { status: 400 });
  }
  const blocks = buildBlocks(body);
  if (!blocks.ok) return NextResponse.json({ error: blocks.error }, { status: 400 });

  const durationMin = Number.isFinite(body.durationMin) ? Math.max(0, Math.round(body.durationMin as number)) : null;

  const admin = await createAdminClient();

  const { data: plan, error: planError } = await admin
    .from('workout_plans')
    .insert({
      slug,
      title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      phase: 'routine',
      focus: body.occasion,
      weeks: 1,
      required_tier: requiredTier,
      is_published: false,
      sort_order: Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder as number) : 0,
    })
    .select('id, slug')
    .single();

  if (planError || !plan) {
    if ((planError as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken. Choose a different one.' }, { status: 409 });
    }
    return fail('create-plan', planError, 'Could not create that routine.');
  }

  const { error: sessionError } = await admin.from('workout_sessions').insert({
    plan_id: plan.id,
    week: 1,
    day: 1,
    title,
    duration_min: durationMin,
    blocks: blocks.value,
  });

  if (sessionError) {
    // Roll back the orphaned plan row rather than leave a routine with no content.
    await admin.from('workout_plans').delete().eq('id', plan.id);
    return fail('create-session', sessionError, 'Could not save that routine’s exercises.');
  }

  return NextResponse.json({ id: plan.id, slug: plan.slug });
}

/* --------------------------------------------------------------------------
   PATCH — full edit, or a quick publish/unpublish/reorder.
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

  // Quick single-field actions — publish toggle or reorder.
  if (typeof body.isPublished === 'boolean' && Object.keys(body).length <= 2) {
    const { error } = await admin.from('workout_plans').update({ is_published: body.isPublished }).eq('id', id);
    if (error) return fail('publish', error, 'Could not change that routine’s status.');
    return NextResponse.json({ ok: true });
  }
  if (typeof body.sortOrder === 'number' && Object.keys(body).length <= 2) {
    const { error } = await admin.from('workout_plans').update({ sort_order: Math.round(body.sortOrder) }).eq('id', id);
    if (error) return fail('reorder', error, 'Could not reorder that routine.');
    return NextResponse.json({ ok: true });
  }

  // Full edit — plan fields.
  const planPatch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim().length >= 3) planPatch.title = body.title.trim();
  if (typeof body.description === 'string') planPatch.description = body.description.trim() || null;
  if (inList(ROUTINE_OCCASIONS, body.occasion)) planPatch.focus = body.occasion;
  if (body.requiredTier === 'basic' || body.requiredTier === 'premium') planPatch.required_tier = body.requiredTier;
  if (typeof body.slug === 'string' && body.slug.trim()) planPatch.slug = toSlug(body.slug);
  if (Number.isFinite(body.sortOrder)) planPatch.sort_order = Math.round(body.sortOrder as number);

  if (Object.keys(planPatch).length > 0) {
    const { error } = await admin.from('workout_plans').update(planPatch).eq('id', id);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'That slug is already taken. Choose a different one.' }, { status: 409 });
      }
      return fail('update-plan', error, 'Could not save that routine.');
    }
  }

  // Full edit — session fields (duration + the blocks jsonb).
  const blocks = buildBlocks(body);
  if (!blocks.ok) return NextResponse.json({ error: blocks.error }, { status: 400 });

  const sessionPatch: Record<string, unknown> = { blocks: blocks.value };
  if (Number.isFinite(body.durationMin)) sessionPatch.duration_min = Math.max(0, Math.round(body.durationMin as number));
  if (typeof body.title === 'string' && body.title.trim().length >= 3) sessionPatch.title = body.title.trim();

  const { error: sessionError } = await admin
    .from('workout_sessions')
    .update(sessionPatch)
    .eq('plan_id', id)
    .eq('week', 1)
    .eq('day', 1);

  if (sessionError) return fail('update-session', sessionError, 'Could not save that routine’s exercises.');

  return NextResponse.json({ ok: true });
}

/* --------------------------------------------------------------------------
   DELETE — real delete. workout_sessions and workout_completions cascade.
-------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('workout_plans').delete().eq('id', id);
  if (error) return fail('delete', error, 'Could not delete that routine.');

  return NextResponse.json({ ok: true, deleted: true });
}
