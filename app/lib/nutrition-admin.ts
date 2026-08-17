// Server-only. Same guard as lib/nutrition.ts.
if (typeof window !== 'undefined') {
  throw new Error('lib/nutrition-admin.ts is server-only.');
}

import { RECIPE_CATEGORIES, TIMING_WINDOWS } from './nutrition';

/* ==========================================================================
   NUTRITION CMS — SHARED VALIDATION

   Every admin mutation runs through here before it reaches Postgres.

   THIS IS NOT THE SECURITY BOUNDARY. Authorization is requireStaff() at the
   top of each route, and beneath that the 0012 RLS policies require
   auth_is_staff(). This module only decides whether a payload is well-formed
   — it is the fast, friendly rejection that keeps garbage out of the table
   and keeps CHECK-constraint violations from surfacing as raw SQL errors.

   Every validator returns a plain message, never a Postgres error, so nothing
   internal is ever echoed to the browser.
   ========================================================================== */

export const RECIPE_STATUSES = ['draft', 'published', 'archived'] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const NUTRITION_SOURCES = ['estimate', 'usda', 'verified'] as const;
export type NutritionSourceValue = (typeof NUTRITION_SOURCES)[number];

export const DIFFICULTIES = ['easy', 'moderate', 'advanced'] as const;

export const EVIDENCE_RATINGS = ['strong', 'moderate', 'emerging', 'limited'] as const;
export type EvidenceRating = (typeof EVIDENCE_RATINGS)[number];

export const TIERS = ['none', 'basic', 'premium'] as const;

/** Boolean recipe flags, so routes and the editor iterate one list. */
export const RECIPE_FLAGS = [
  'is_quick',
  'is_make_ahead',
  'is_travel_friendly',
  'is_pre_game',
  'is_post_game',
  'is_pre_practice',
  'is_post_practice',
  'is_pre_workout',
  'is_post_workout',
  'is_recovery',
  'is_tournament',
] as const;

export type RecipeFlag = (typeof RECIPE_FLAGS)[number];

export const FLAG_LABEL: Record<RecipeFlag, string> = {
  is_quick: 'Quick',
  is_make_ahead: 'Make ahead',
  is_travel_friendly: 'Travel friendly',
  is_pre_game: 'Pre-game',
  is_post_game: 'Post-game',
  is_pre_practice: 'Pre-practice',
  is_post_practice: 'Post-practice',
  is_pre_workout: 'Pre-workout',
  is_post_workout: 'Post-workout',
  is_recovery: 'Recovery',
  is_tournament: 'Tournament',
};

/* --------------------------------------------------------------------------
   PRIMITIVES
-------------------------------------------------------------------------- */

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

/**
 * A URL-safe slug. Generated from the title when the admin leaves it blank, so
 * nobody has to hand-write one, but validated either way — an invalid slug
 * would 404 the player-facing page with no obvious cause.
 */
export function toSlug(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function isValidSlug(v: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length >= 3 && v.length <= 90;
}

/**
 * A non-negative integer, or null.
 *
 * Returns the string 'invalid' rather than throwing so callers can distinguish
 * "field omitted" (null) from "field present but nonsense" and reject the
 * latter. Negative calories/macros/quantities are refused here — the database
 * has no CHECK for them, so this is the only thing standing in the way.
 */
export function nonNegativeInt(v: unknown): number | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return Math.trunc(n);
}

export function nonNegativeNumber(v: unknown): number | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return n;
}

function inList<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

/* --------------------------------------------------------------------------
   RECIPE PAYLOAD
-------------------------------------------------------------------------- */

export interface IngredientInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  metric_note: string | null;
  optional: boolean;
  notes: string | null;
  sort_order: number;
}

export interface StepInput {
  body: string;
  sort_order: number;
}

export interface RecipePayload {
  slug: string;
  title: string;
  description: string | null;
  why_it_works: string | null;
  coach_tip: string | null;
  category: string;
  meal_type: string | null;
  timing: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  nutrition_source: NutritionSourceValue;
  difficulty: string | null;
  equipment: string[];
  status: RecipeStatus;
  required_tier: string;
  sort_order: number;
  [flag: string]: unknown;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Validates a full recipe body from the admin editor.
 *
 * Deliberately strict about the things that would either corrupt the player
 * experience (bad slug, unknown category) or violate a database CHECK
 * constraint (status, nutrition_source, difficulty) — the latter would
 * otherwise surface to the admin as an opaque Postgres error.
 */
export function validateRecipe(body: Record<string, unknown>): ValidationResult<RecipePayload> {
  const title = cleanText(body.title, 200);
  if (!title) return { ok: false, error: 'A title is required.' };

  const rawSlug = cleanText(body.slug, 90) ?? toSlug(title);
  const slug = toSlug(rawSlug);
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be 3–90 characters, lowercase letters, numbers and hyphens.' };
  }

  if (!inList(RECIPE_CATEGORIES, body.category)) {
    return { ok: false, error: 'Choose a valid category.' };
  }

  const status = body.status ?? 'draft';
  if (!inList(RECIPE_STATUSES, status)) {
    return { ok: false, error: 'Status must be draft, published or archived.' };
  }

  const nutritionSource = body.nutrition_source ?? 'estimate';
  if (!inList(NUTRITION_SOURCES, nutritionSource)) {
    return { ok: false, error: 'Nutrition source must be estimate, usda or verified.' };
  }

  const tier = body.required_tier ?? 'premium';
  if (!inList(TIERS, tier)) {
    return { ok: false, error: 'Required tier must be none, basic or premium.' };
  }

  let difficulty: string | null = null;
  if (body.difficulty !== null && body.difficulty !== undefined && body.difficulty !== '') {
    if (!inList(DIFFICULTIES, body.difficulty)) {
      return { ok: false, error: 'Difficulty must be easy, moderate or advanced.' };
    }
    difficulty = body.difficulty;
  }

  // Unknown timing values are dropped rather than rejected — the window list
  // may grow, and a stale value from an old editor tab should not block a save.
  const timing = Array.isArray(body.timing)
    ? body.timing.filter((t): t is string => inList(TIMING_WINDOWS, t))
    : [];

  const equipment = Array.isArray(body.equipment)
    ? body.equipment
        .map((e) => (typeof e === 'string' ? e.trim().slice(0, 80) : ''))
        .filter(Boolean)
    : [];

  const numeric: Record<string, number | null> = {};
  for (const key of [
    'prep_minutes',
    'cook_minutes',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'fiber_g',
    'sodium_mg',
  ]) {
    const parsed = nonNegativeInt(body[key]);
    if (parsed === 'invalid') {
      return { ok: false, error: `${key.replace(/_/g, ' ')} cannot be negative.` };
    }
    numeric[key] = parsed;
  }

  const servingsParsed = nonNegativeInt(body.servings);
  if (servingsParsed === 'invalid' || servingsParsed === 0) {
    return { ok: false, error: 'Servings must be at least 1.' };
  }

  const sortParsed = nonNegativeInt(body.sort_order);
  if (sortParsed === 'invalid') return { ok: false, error: 'Sort order cannot be negative.' };

  const payload: RecipePayload = {
    slug,
    title,
    description: cleanText(body.description, 2000),
    why_it_works: cleanText(body.why_it_works, 4000),
    coach_tip: cleanText(body.coach_tip, 2000),
    category: body.category,
    meal_type: cleanText(body.meal_type, 60),
    timing,
    prep_minutes: numeric.prep_minutes,
    cook_minutes: numeric.cook_minutes,
    servings: servingsParsed ?? 1,
    calories: numeric.calories,
    protein_g: numeric.protein_g,
    carbs_g: numeric.carbs_g,
    fat_g: numeric.fat_g,
    fiber_g: numeric.fiber_g,
    sodium_mg: numeric.sodium_mg,
    nutrition_source: nutritionSource,
    difficulty,
    equipment,
    status,
    required_tier: tier,
    sort_order: sortParsed ?? 0,
  };

  for (const flag of RECIPE_FLAGS) payload[flag] = Boolean(body[flag]);

  return { ok: true, value: payload };
}

/** Ingredient rows. Blank names are dropped; negative quantities are refused. */
export function validateIngredients(
  raw: unknown
): ValidationResult<IngredientInput[]> {
  if (!Array.isArray(raw)) return { ok: true, value: [] };

  const out: IngredientInput[] = [];
  for (const [i, item] of raw.entries()) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;

    const name = cleanText(row.name, 160);
    if (!name) continue; // silently skip empty editor rows

    const quantity = nonNegativeNumber(row.quantity);
    if (quantity === 'invalid') {
      return { ok: false, error: `Ingredient "${name}" has a negative quantity.` };
    }

    out.push({
      name,
      quantity,
      unit: cleanText(row.unit, 40),
      metric_note: cleanText(row.metric_note, 60),
      optional: Boolean(row.optional),
      notes: cleanText(row.notes, 400),
      sort_order: i,
    });
  }
  return { ok: true, value: out };
}

/** Instruction rows, renumbered from their array position. */
export function validateSteps(raw: unknown): ValidationResult<StepInput[]> {
  if (!Array.isArray(raw)) return { ok: true, value: [] };

  const out: StepInput[] = [];
  for (const item of raw) {
    const body = typeof item === 'string' ? cleanText(item, 1200) : cleanText((item as Record<string, unknown>)?.body, 1200);
    if (!body) continue;
    out.push({ body, sort_order: out.length });
  }
  return { ok: true, value: out };
}

/**
 * Tags, normalised and de-duplicated.
 *
 * The (recipe_id, tag) primary key would reject a duplicate with a unique
 * violation; collapsing them here means the admin never sees that error for
 * something as harmless as typing the same tag twice.
 */
export function validateTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const t of raw) {
    if (typeof t !== 'string') continue;
    const tag = t.trim().toLowerCase().slice(0, 40);
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/* --------------------------------------------------------------------------
   SECRET SAUCE PAYLOAD
-------------------------------------------------------------------------- */

export interface SecretSaucePayload {
  slug: string;
  title: string;
  category: string | null;
  what_it_is: string | null;
  why_it_may_work: string | null;
  when_to_use: string | null;
  how_to_use: string | null;
  dosage: string | null;
  who_should_avoid: string | null;
  side_effects: string | null;
  practical_example: string | null;
  evidence_rating: EvidenceRating;
  status: RecipeStatus;
  required_tier: string;
  sort_order: number;
}

export function validateSecretSauce(
  body: Record<string, unknown>
): ValidationResult<SecretSaucePayload> {
  const title = cleanText(body.title, 200);
  if (!title) return { ok: false, error: 'A title is required.' };

  const slug = toSlug(cleanText(body.slug, 90) ?? title);
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be 3–90 characters, lowercase letters, numbers and hyphens.' };
  }

  const evidence = body.evidence_rating ?? 'limited';
  if (!inList(EVIDENCE_RATINGS, evidence)) {
    return { ok: false, error: 'Evidence rating must be strong, moderate, emerging or limited.' };
  }

  const status = body.status ?? 'draft';
  if (!inList(RECIPE_STATUSES, status)) {
    return { ok: false, error: 'Status must be draft, published or archived.' };
  }

  const tier = body.required_tier ?? 'premium';
  if (!inList(TIERS, tier)) return { ok: false, error: 'Invalid required tier.' };

  const sortParsed = nonNegativeInt(body.sort_order);
  if (sortParsed === 'invalid') return { ok: false, error: 'Sort order cannot be negative.' };

  return {
    ok: true,
    value: {
      slug,
      title,
      category: cleanText(body.category, 80),
      what_it_is: cleanText(body.what_it_is, 4000),
      why_it_may_work: cleanText(body.why_it_may_work, 4000),
      when_to_use: cleanText(body.when_to_use, 4000),
      how_to_use: cleanText(body.how_to_use, 4000),
      dosage: cleanText(body.dosage, 2000),
      who_should_avoid: cleanText(body.who_should_avoid, 2000),
      side_effects: cleanText(body.side_effects, 2000),
      practical_example: cleanText(body.practical_example, 2000),
      evidence_rating: evidence,
      status,
      required_tier: tier,
      sort_order: sortParsed ?? 0,
    },
  };
}

export interface SourceInput {
  organization: string;
  title: string;
  publication_year: number | null;
  source_type: string | null;
  url: string | null;
  doi: string | null;
  sort_order: number;
}

/**
 * Citation rows.
 *
 * url and doi stay NULL unless an admin actually supplies one. Nothing in this
 * system ever generates a citation link — an unverified URL is worse than no
 * URL, because it looks authoritative.
 */
export function validateSources(raw: unknown): ValidationResult<SourceInput[]> {
  if (!Array.isArray(raw)) return { ok: true, value: [] };

  const out: SourceInput[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;

    const organization = cleanText(row.organization, 160);
    const title = cleanText(row.title, 300);
    if (!organization || !title) continue; // both are required to be meaningful

    const year = nonNegativeInt(row.publication_year);
    if (year === 'invalid') {
      return { ok: false, error: `Publication year for "${title}" is invalid.` };
    }
    if (year !== null && (year < 1900 || year > 2200)) {
      return { ok: false, error: `Publication year for "${title}" looks wrong.` };
    }

    const url = cleanText(row.url, 500);
    if (url && !/^https?:\/\//i.test(url)) {
      return { ok: false, error: 'Source URLs must start with http:// or https://' };
    }

    out.push({
      organization,
      title,
      publication_year: year,
      source_type: cleanText(row.source_type, 60),
      url,
      doi: cleanText(row.doi, 120),
      sort_order: out.length,
    });
  }
  return { ok: true, value: out };
}
