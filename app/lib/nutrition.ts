// Server-only. Same guard as lib/library.ts — if this module is ever pulled
// into a client bundle the app fails loudly at import time.
if (typeof window !== 'undefined') {
  throw new Error('lib/nutrition.ts is server-only.');
}

import { DEMO_MODE } from './session';
import type { Tier } from './types';

/* ==========================================================================
   ATHLETE NUTRITION COOKBOOK — DATA LAYER

   The single place /nutrition and /nutrition/[slug] read recipe content from.

   ACCESS MODEL — SIMPLER THAN THE TRAINING LIBRARY, ON PURPOSE
   -----------------------------------------------------------
   /library deliberately shows locked Premium lessons to Standard members so
   they can see what upgrading buys, which forces a two-query split (one
   RLS-bound, one service-role) in lib/library.ts.

   The cookbook has no such requirement: the whole surface is Premium-gated by
   requireFeature('nutrition_plans') before any of this runs. So every read
   here goes through the SESSION client and Postgres RLS is the only thing
   deciding what comes back. There is no service-role read path in this module
   and no TypeScript tier comparison to get wrong.

   FILTERING AND SEARCH HAPPEN IN POSTGRES
   ---------------------------------------
   Every filter below is applied with .eq/.gte/.lte/.overlaps/.textSearch on
   the query builder, never by fetching the cookbook and slicing it in JS. The
   0012 indexes (gin on timing, gin tsvector on title+description, and the
   status/category/sort composites) exist to serve exactly these calls.
   ========================================================================== */

export const RECIPE_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'smoothies',
  'pre_game',
  'post_game',
  'pre_practice',
  'post_practice',
  'pre_workout',
  'post_workout',
  'recovery',
  'road',
  'tournament',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<RecipeCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  smoothies: 'Smoothies',
  pre_game: 'Pre-Game',
  post_game: 'Post-Game',
  pre_practice: 'Pre-Practice',
  post_practice: 'Post-Practice',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
  recovery: 'Recovery',
  road: 'Road / Travel',
  tournament: 'Tournament',
};

/** Fuelling windows. Values match nutrition_recipes.timing[] entries. */
export const TIMING_WINDOWS = [
  '3-4h_before',
  '2-3h_before',
  '1-2h_before',
  '30-60m_before',
  'immediately_after',
  '1-2h_after',
] as const;

export type TimingWindow = (typeof TIMING_WINDOWS)[number];

export const TIMING_LABEL: Record<TimingWindow, string> = {
  '3-4h_before': '3–4 hours before',
  '2-3h_before': '2–3 hours before',
  '1-2h_before': '1–2 hours before',
  '30-60m_before': '30–60 min before',
  immediately_after: 'Immediately after',
  '1-2h_after': '1–2 hours after',
};

/* --------------------------------------------------------------------------
   SEARCH INPUT SANITISATION

   PostgREST's .or() takes a FILTER STRING, and comma is its delimiter. Passing
   raw user input into it meant a search for `chicken,status.eq.draft` was
   parsed as extra filter terms, and a stray `(` or `)` broke the query
   outright.

   To be precise about the severity: this was never a privilege escalation.
   RLS policies are evaluated by Postgres independently of the request filter,
   so no filter string can widen what a member is allowed to read — the
   post-fix RLS test below re-confirms that. It was a robustness bug:
   malformed queries, confusing errors, and unintended matches.

   WHY SANITISE RATHER THAN SWITCH TO FULL-TEXT SEARCH
   0012 created a gin tsvector index, and the obvious move is .textSearch().
   Two reasons that is the wrong call here:

     1. PostgREST's .textSearch() targets a tsvector COLUMN. Ours is a
        functional index over an expression, so it would need a new generated
        column and a migration to be usable at all.

     2. websearch_to_tsquery does not do prefix matching. A player typing
        "chick" would get nothing back for "Chicken & Rice Bowl". For a
        cookbook that is a worse experience than the bug being fixed.

   At cookbook scale (hundreds of rows, not millions) ILIKE is comfortably
   fast, so the pragmatic fix is to make the input safe and keep partial-word
   matching. The allowlist below removes every character with meaning to
   PostgREST (, . ( ) :) and to LIKE (% _), rather than trying to escape them.
-------------------------------------------------------------------------- */
export function sanitizeSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[^a-zA-Z0-9 \-']/g, ' ') // allowlist: letters, digits, space, hyphen, apostrophe
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function isCategory(v: unknown): v is RecipeCategory {
  return typeof v === 'string' && (RECIPE_CATEGORIES as readonly string[]).includes(v);
}

export function isTiming(v: unknown): v is TimingWindow {
  return typeof v === 'string' && (TIMING_WINDOWS as readonly string[]).includes(v);
}

/**
 * Reads a filter value off the URL. Anything unrecognised — a typo, a removed
 * category, an injection attempt — resolves to null and renders the unfiltered
 * view. A bad query string must never produce an error page.
 */
export function parseCategory(v: unknown): RecipeCategory | null {
  return isCategory(v) ? v : null;
}

export function parseTiming(v: unknown): TimingWindow | null {
  return isTiming(v) ? v : null;
}

/* --------------------------------------------------------------------------
   TYPES
-------------------------------------------------------------------------- */

/** Whether the macros on a recipe are derived or sourced. Drives the UI label. */
export type NutritionSource = 'estimate' | 'usda' | 'verified';

export interface RecipeCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  mealType: string | null;
  timing: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  /** 'estimate' means the UI MUST label the numbers as estimated. */
  nutritionSource: NutritionSource;
  isQuick: boolean;
  isTravelFriendly: boolean;
  isMakeAhead: boolean;
  requiredTier: Tier;
  tags: string[];
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  metricNote: string | null;
  optional: boolean;
  notes: string | null;
}

export interface RecipeStep {
  id: string;
  body: string;
}

export interface RecipeDetail extends RecipeCard {
  whyItWorks: string | null;
  coachTip: string | null;
  fiberG: number | null;
  sodiumMg: number | null;
  difficulty: string | null;
  equipment: string[];
  isPreGame: boolean;
  isPostGame: boolean;
  isPrePractice: boolean;
  isPostPractice: boolean;
  isPreWorkout: boolean;
  isPostWorkout: boolean;
  isRecovery: boolean;
  isTournament: boolean;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface RecipeFilters {
  q?: string | null;
  category?: RecipeCategory | null;
  timing?: TimingWindow | null;
  quick?: boolean;
  travel?: boolean;
  makeAhead?: boolean;
  /** Upper bound on prep+cook, in minutes. */
  maxMinutes?: number | null;
  minProtein?: number | null;
}

export interface CookbookView {
  recipes: RecipeCard[];
  /** Published recipe count per category, for the filter chips. */
  counts: Record<string, number>;
  total: number;
  /** True when Supabase is not configured — the page shows an empty state. */
  unavailable: boolean;
}

/* --------------------------------------------------------------------------
   ROW MAPPING
-------------------------------------------------------------------------- */

const CARD_COLUMNS =
  'id, slug, title, description, category, meal_type, timing, prep_minutes, cook_minutes, ' +
  'servings, calories, protein_g, carbs_g, fat_g, nutrition_source, is_quick, ' +
  'is_travel_friendly, is_make_ahead, required_tier, sort_order';

interface RawRecipe {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  meal_type: string | null;
  timing: string[] | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  nutrition_source: string | null;
  is_quick: boolean | null;
  is_travel_friendly: boolean | null;
  is_make_ahead: boolean | null;
  required_tier: string | null;
}

function totalMinutes(prep: number | null, cook: number | null): number | null {
  if (prep === null && cook === null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

function toCard(row: RawRecipe, tags: string[] = []): RecipeCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    mealType: row.meal_type,
    timing: row.timing ?? [],
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    totalMinutes: totalMinutes(row.prep_minutes, row.cook_minutes),
    servings: row.servings ?? 1,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    // Default to the conservative value. An unknown source is treated as an
    // estimate so the UI labels it rather than implying it is sourced.
    nutritionSource: (row.nutrition_source as NutritionSource) ?? 'estimate',
    isQuick: Boolean(row.is_quick),
    isTravelFriendly: Boolean(row.is_travel_friendly),
    isMakeAhead: Boolean(row.is_make_ahead),
    requiredTier: (row.required_tier as Tier) ?? 'premium',
    tags,
  };
}

/* --------------------------------------------------------------------------
   QUERIES
-------------------------------------------------------------------------- */

/**
 * The cookbook for one member, narrowed by any combination of filters.
 *
 * Reads through the session client so RLS decides visibility: a member sees
 * published rows their tier covers, staff additionally see drafts. Nothing
 * here re-implements that check.
 */
export async function getCookbook(filters: RecipeFilters = {}): Promise<CookbookView> {
  if (DEMO_MODE) {
    return { recipes: [], counts: {}, total: 0, unavailable: true };
  }

  const { createServerClient } = await import('./supabase/server');
  const supabase = await createServerClient();

  // --- counts per category, one minimal projection -------------------------
  const { data: countRows } = await supabase
    .from('nutrition_recipes')
    .select('category')
    .eq('status', 'published');

  const counts: Record<string, number> = {};
  for (const row of countRows ?? []) {
    const key = (row as { category: string }).category;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  // --- the filtered card query, all narrowing done in Postgres -------------
  let query = supabase
    .from('nutrition_recipes')
    .select(CARD_COLUMNS)
    .eq('status', 'published');

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.timing) query = query.overlaps('timing', [filters.timing]);
  if (filters.quick) query = query.eq('is_quick', true);
  if (filters.travel) query = query.eq('is_travel_friendly', true);
  if (filters.makeAhead) query = query.eq('is_make_ahead', true);
  if (typeof filters.minProtein === 'number') {
    query = query.gte('protein_g', filters.minProtein);
  }

  // Sanitised to an allowlist before it ever reaches the filter string — see
  // sanitizeSearch(). Partial-word matching is preserved on purpose.
  const q = sanitizeSearch(filters.q);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('[nutrition] cookbook query failed:', error.message);
    return { recipes: [], counts, total: 0, unavailable: false };
  }

  let recipes = (data ?? []).map((r) => toCard(r as unknown as RawRecipe));

  // maxMinutes is derived (prep + cook) and cannot be expressed as a single
  // column predicate, so it is the one filter applied after the query. It runs
  // over the already-narrowed result set, not the whole cookbook.
  if (typeof filters.maxMinutes === 'number') {
    const cap = filters.maxMinutes;
    recipes = recipes.filter((r) => r.totalMinutes !== null && r.totalMinutes <= cap);
  }

  return { recipes, counts, total: recipes.length, unavailable: false };
}

/**
 * One recipe with its ingredients and steps, or null.
 *
 * Returns null rather than throwing when the slug does not resolve — including
 * when RLS hides a draft from a member, which is indistinguishable from "does
 * not exist" by design.
 */
export async function getRecipeBySlug(slug: string): Promise<RecipeDetail | null> {
  if (DEMO_MODE) return null;

  const { createServerClient } = await import('./supabase/server');
  const supabase = await createServerClient();

  const { data: row, error } = await supabase
    .from('nutrition_recipes')
    .select(
      `${CARD_COLUMNS}, why_it_works, coach_tip, fiber_g, sodium_mg, difficulty, equipment, ` +
        'is_pre_game, is_post_game, is_pre_practice, is_post_practice, ' +
        'is_pre_workout, is_post_workout, is_recovery, is_tournament'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error || !row) return null;

  const raw = row as unknown as RawRecipe & Record<string, unknown>;

  const [{ data: ingredientRows }, { data: stepRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('nutrition_recipe_ingredients')
      .select('id, name, quantity, unit, metric_note, optional, notes, sort_order')
      .eq('recipe_id', raw.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('nutrition_recipe_steps')
      .select('id, body, sort_order')
      .eq('recipe_id', raw.id)
      .order('sort_order', { ascending: true }),
    supabase.from('nutrition_recipe_tags').select('tag').eq('recipe_id', raw.id),
  ]);

  const tags = (tagRows ?? []).map((t) => (t as { tag: string }).tag);

  return {
    ...toCard(raw, tags),
    whyItWorks: (raw.why_it_works as string | null) ?? null,
    coachTip: (raw.coach_tip as string | null) ?? null,
    fiberG: (raw.fiber_g as number | null) ?? null,
    sodiumMg: (raw.sodium_mg as number | null) ?? null,
    difficulty: (raw.difficulty as string | null) ?? null,
    equipment: (raw.equipment as string[] | null) ?? [],
    isPreGame: Boolean(raw.is_pre_game),
    isPostGame: Boolean(raw.is_post_game),
    isPrePractice: Boolean(raw.is_pre_practice),
    isPostPractice: Boolean(raw.is_post_practice),
    isPreWorkout: Boolean(raw.is_pre_workout),
    isPostWorkout: Boolean(raw.is_post_workout),
    isRecovery: Boolean(raw.is_recovery),
    isTournament: Boolean(raw.is_tournament),
    ingredients: (ingredientRows ?? []).map((i) => {
      const r = i as unknown as {
        id: string;
        name: string;
        quantity: number | null;
        unit: string | null;
        metric_note: string | null;
        optional: boolean | null;
        notes: string | null;
      };
      return {
        id: r.id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        metricNote: r.metric_note,
        optional: Boolean(r.optional),
        notes: r.notes,
      };
    }),
    steps: (stepRows ?? []).map((s) => {
      const r = s as unknown as { id: string; body: string };
      return { id: r.id, body: r.body };
    }),
  };
}

/* --------------------------------------------------------------------------
   DISPLAY HELPERS
-------------------------------------------------------------------------- */

/** "6 oz chicken breast (~170 g)" from the structured columns. */
export function formatIngredient(i: RecipeIngredient): string {
  const qty = i.quantity === null ? '' : String(i.quantity);
  const amount = [qty, i.unit].filter(Boolean).join(' ').trim();
  const base = amount ? `${amount} ${i.name}` : i.name;
  return i.metricNote ? `${base} (${i.metricNote})` : base;
}

export function formatMinutes(total: number | null): string {
  if (total === null) return '—';
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * The label that must accompany any macro figure.
 *
 * Never render calories or macros without calling this. Estimated values are
 * derived from standard reference amounts for whole foods, not lab analysis,
 * and the UI is required to say so.
 */
export function nutritionLabel(source: NutritionSource): string {
  return source === 'estimate' ? 'Estimated nutrition' : 'Nutrition';
}
