import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import {
  validateRecipe,
  validateIngredients,
  validateSteps,
  validateTags,
  toSlug,
  RECIPE_FLAGS,
} from '@/lib/nutrition-admin';
import { sanitizeSearch } from '@/lib/nutrition';

export const runtime = 'nodejs';

/* ==========================================================================
   NUTRITION RECIPES  —  STAFF CMS

   AUTHORIZATION IS SERVER-SIDE AND DOUBLE-ENFORCED.
   requireStaff() reads profiles.role from the authenticated session — never
   from a header, query string or body. Beneath it the 0012 RLS policies
   require auth_is_staff() to write nutrition_recipes and every child table.
   A member who crafted a request is refused twice, and the second refusal is
   Postgres itself.

   ARCHIVE IS THE DEFAULT "DELETE".
   DELETE sets status='archived', which removes the recipe from the player
   cookbook while keeping the row, its ingredients and its history. A true
   destructive delete requires ?hard=1 AND an admin role — a coach cannot do
   it at all.

   CHILD ROWS ARE REPLACED, NOT DIFFED.
   Ingredients, steps and tags are deleted and re-inserted on every save. With
   at most a few dozen rows per recipe that is cheaper and far less bug-prone
   than reconciling ids, and it makes reordering trivial: array position IS
   sort_order.
   ========================================================================== */

const LIST_COLUMNS =
  'id, slug, title, category, meal_type, status, required_tier, difficulty, ' +
  'prep_minutes, cook_minutes, servings, calories, protein_g, carbs_g, fat_g, ' +
  'nutrition_source, is_quick, is_travel_friendly, sort_order, updated_at';

/** Never let a Postgres message reach the browser. Log it, return a clean one. */
function fail(scope: string, error: { message: string } | null, friendly: string, status = 500) {
  console.error(`[nutrition-cms] ${scope} failed:`, error?.message);
  return NextResponse.json({ error: friendly }, { status });
}

/* --------------------------------------------------------------------------
   GET — list for the admin console, filtered in Postgres.
-------------------------------------------------------------------------- */
export async function GET(req: Request) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ recipes: [], counts: {} });

  const { searchParams } = new URL(req.url);
  const admin = await createAdminClient();

  // Counts drive the dashboard tiles. One minimal projection over every row.
  const { data: statusRows } = await admin.from('nutrition_recipes').select('status');
  const counts: Record<string, number> = { draft: 0, published: 0, archived: 0, total: 0 };
  for (const r of statusRows ?? []) {
    const s = (r as { status: string }).status;
    counts[s] = (counts[s] ?? 0) + 1;
    counts.total += 1;
  }

  let query = admin.from('nutrition_recipes').select(LIST_COLUMNS);

  const status = searchParams.get('status');
  if (status && status !== 'all') query = query.eq('status', status);

  const category = searchParams.get('category');
  if (category) query = query.eq('category', category);

  const tier = searchParams.get('tier');
  if (tier) query = query.eq('required_tier', tier);

  const difficulty = searchParams.get('difficulty');
  if (difficulty) query = query.eq('difficulty', difficulty);

  const timing = searchParams.get('timing');
  if (timing) query = query.overlaps('timing', [timing]);

  if (searchParams.get('quick') === '1') query = query.eq('is_quick', true);
  if (searchParams.get('travel') === '1') query = query.eq('is_travel_friendly', true);

  // Allowlist-sanitised before entering the PostgREST filter string. Comma is
  // that string's delimiter, so raw input could inject extra filter terms.
  const q = sanitizeSearch(searchParams.get('q'));
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

  // Sort options mirror the admin UI's dropdown.
  switch (searchParams.get('sort')) {
    case 'newest':
      query = query.order('updated_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('updated_at', { ascending: true });
      break;
    case 'alpha':
      query = query.order('title', { ascending: true });
      break;
    default:
      query = query.order('sort_order', { ascending: true }).order('title', { ascending: true });
  }

  const { data, error } = await query.limit(500);
  if (error) return fail('list', error, 'Could not load recipes.');

  return NextResponse.json({ recipes: data ?? [], counts });
}

/* --------------------------------------------------------------------------
   Child-row replacement, shared by POST and PATCH.
-------------------------------------------------------------------------- */
async function replaceChildren(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  recipeId: string,
  body: Record<string, unknown>
): Promise<string | null> {
  if (body.ingredients !== undefined) {
    const parsed = validateIngredients(body.ingredients);
    if (!parsed.ok) return parsed.error;

    await admin.from('nutrition_recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (parsed.value.length) {
      const { error } = await admin
        .from('nutrition_recipe_ingredients')
        .insert(parsed.value.map((i) => ({ ...i, recipe_id: recipeId })));
      if (error) {
        console.error('[nutrition-cms] ingredients insert failed:', error.message);
        return 'Could not save the ingredients.';
      }
    }
  }

  if (body.steps !== undefined) {
    const parsed = validateSteps(body.steps);
    if (!parsed.ok) return parsed.error;

    await admin.from('nutrition_recipe_steps').delete().eq('recipe_id', recipeId);
    if (parsed.value.length) {
      const { error } = await admin
        .from('nutrition_recipe_steps')
        .insert(parsed.value.map((s) => ({ ...s, recipe_id: recipeId })));
      if (error) {
        console.error('[nutrition-cms] steps insert failed:', error.message);
        return 'Could not save the instructions.';
      }
    }
  }

  if (body.tags !== undefined) {
    const tags = validateTags(body.tags);
    await admin.from('nutrition_recipe_tags').delete().eq('recipe_id', recipeId);
    if (tags.length) {
      const { error } = await admin
        .from('nutrition_recipe_tags')
        .insert(tags.map((tag) => ({ recipe_id: recipeId, tag })));
      if (error) {
        console.error('[nutrition-cms] tags insert failed:', error.message);
        return 'Could not save the tags.';
      }
    }
  }

  return null;
}

/* --------------------------------------------------------------------------
   POST — create a recipe, or duplicate an existing one.
-------------------------------------------------------------------------- */
export async function POST(req: Request) {
  const session = await requireStaff();
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — connect Supabase first.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  /* ---- DUPLICATE ------------------------------------------------------- */
  if (typeof body.duplicateOf === 'string' && body.duplicateOf) {
    const { data: src, error: srcError } = await admin
      .from('nutrition_recipes')
      .select('*')
      .eq('id', body.duplicateOf)
      .maybeSingle();

    if (srcError || !src) return fail('duplicate-read', srcError, 'Could not find that recipe.', 404);

    const source = src as Record<string, unknown>;

    // A unique slug, without guessing: try -copy, then -copy-2, -copy-3…
    const base = `${toSlug(String(source.slug))}-copy`;
    let slug = base;
    for (let n = 2; n < 50; n += 1) {
      const { data: clash } = await admin
        .from('nutrition_recipes')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${n}`;
    }

    const copy: Record<string, unknown> = {
      slug,
      title: `${String(source.title)} (copy)`,
      description: source.description,
      why_it_works: source.why_it_works,
      coach_tip: source.coach_tip,
      category: source.category,
      meal_type: source.meal_type,
      timing: source.timing,
      prep_minutes: source.prep_minutes,
      cook_minutes: source.cook_minutes,
      servings: source.servings,
      calories: source.calories,
      protein_g: source.protein_g,
      carbs_g: source.carbs_g,
      fat_g: source.fat_g,
      fiber_g: source.fiber_g,
      sodium_mg: source.sodium_mg,
      // Preserved deliberately — a copy of an estimated recipe is still estimated.
      nutrition_source: source.nutrition_source,
      difficulty: source.difficulty,
      equipment: source.equipment,
      required_tier: source.required_tier,
      sort_order: source.sort_order,
      // A duplicate always starts as a draft, never live.
      status: 'draft',
      created_by: session.userId,
    };
    for (const flag of RECIPE_FLAGS) copy[flag] = source[flag];

    const { data: created, error: insertError } = await admin
      .from('nutrition_recipes')
      .insert(copy)
      .select('id, slug')
      .single();

    if (insertError || !created) {
      return fail('duplicate-insert', insertError, 'Could not duplicate that recipe.');
    }

    // Copy children by reading the originals and re-inserting against the new id.
    const [{ data: ing }, { data: steps }, { data: tags }] = await Promise.all([
      admin
        .from('nutrition_recipe_ingredients')
        .select('name, quantity, unit, metric_note, optional, notes, sort_order')
        .eq('recipe_id', body.duplicateOf),
      admin
        .from('nutrition_recipe_steps')
        .select('body, sort_order')
        .eq('recipe_id', body.duplicateOf),
      admin.from('nutrition_recipe_tags').select('tag').eq('recipe_id', body.duplicateOf),
    ]);

    if (ing?.length) {
      await admin
        .from('nutrition_recipe_ingredients')
        .insert(ing.map((r) => ({ ...(r as object), recipe_id: created.id })));
    }
    if (steps?.length) {
      await admin
        .from('nutrition_recipe_steps')
        .insert(steps.map((r) => ({ ...(r as object), recipe_id: created.id })));
    }
    if (tags?.length) {
      await admin
        .from('nutrition_recipe_tags')
        .insert(tags.map((r) => ({ tag: (r as { tag: string }).tag, recipe_id: created.id })));
    }

    return NextResponse.json({ id: created.id, slug: created.slug, duplicated: true });
  }

  /* ---- CREATE ---------------------------------------------------------- */
  const parsed = validateRecipe(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data: created, error } = await admin
    .from('nutrition_recipes')
    .insert({ ...parsed.value, created_by: session.userId })
    .select('id, slug')
    .single();

  if (error || !created) {
    // 23505 is the unique violation on slug — the one collision an admin can
    // actually cause and fix, so it gets a specific message.
    if ((error as { code?: string } | null)?.code === '23505') {
      return NextResponse.json(
        { error: 'That slug is already taken. Choose a different one.' },
        { status: 409 }
      );
    }
    return fail('create', error, 'Could not create that recipe.');
  }

  const childError = await replaceChildren(admin, created.id, body);
  if (childError) return NextResponse.json({ error: childError }, { status: 400 });

  return NextResponse.json({ id: created.id, slug: created.slug });
}

/* --------------------------------------------------------------------------
   PATCH — full edit, or a targeted status change.
-------------------------------------------------------------------------- */
export async function PATCH(req: Request) {
  await requireStaff();
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

  // Status-only change (publish / unpublish / archive / restore). Kept separate
  // so a one-click action from the list does not require the whole payload.
  if (body.statusOnly === true) {
    const status = body.status;
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    const { error } = await admin.from('nutrition_recipes').update({ status }).eq('id', id);
    if (error) return fail('status', error, 'Could not change that recipe’s status.');
    return NextResponse.json({ ok: true });
  }

  const parsed = validateRecipe(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { error } = await admin.from('nutrition_recipes').update(parsed.value).eq('id', id);
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'That slug is already taken. Choose a different one.' },
        { status: 409 }
      );
    }
    return fail('update', error, 'Could not save that recipe.');
  }

  const childError = await replaceChildren(admin, id, body);
  if (childError) return NextResponse.json({ error: childError }, { status: 400 });

  return NextResponse.json({ ok: true });
}

/* --------------------------------------------------------------------------
   DELETE — archive by default. ?hard=1 permanently removes, admin only.
-------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  const session = await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();

  if (searchParams.get('hard') === '1') {
    // Destructive and irreversible, so it is admin-only — a coach archiving by
    // mistake is recoverable, a coach hard-deleting is not.
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only an admin can permanently delete a recipe.' },
        { status: 403 }
      );
    }
    // Child rows go with it via ON DELETE CASCADE from 0012.
    const { error } = await admin.from('nutrition_recipes').delete().eq('id', id);
    if (error) return fail('hard-delete', error, 'Could not delete that recipe.');
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await admin
    .from('nutrition_recipes')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) return fail('archive', error, 'Could not archive that recipe.');
  return NextResponse.json({ ok: true, archived: true });
}
