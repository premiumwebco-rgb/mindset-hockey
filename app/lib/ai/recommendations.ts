/* ==========================================================================
   AI TRAINING RECOMMENDATIONS

   Deterministic mapping from a completed shot analysis onto the training
   library. No AI model is called here — this is arithmetic over a result
   that has already been graded, exactly once, by the existing analyzer.

   This file has ZERO imports from lib/session, lib/library, or Supabase.
   That is deliberate: it keeps the recommendation logic itself unit
   testable with the plain Node test runner (see recommendations.test.ts),
   and it means a bug in this file can never reach the database or the AI
   pipeline — it can only ever mis-rank or omit a video suggestion.

   Uses the REAL AI rubric category keys from lib/ai/rubric.ts (the ones the
   vision model actually grades against), never the separate, older `RUBRIC`
   in lib/types.ts used by the human coach-review editor and drill database.
   ========================================================================== */

import type { CategoryKey, CategoryScore } from './rubric';
import { RUBRIC_BY_CATEGORY } from './rubric';
import type { Tier } from '../types';

/**
 * Below this score (out of 10), a category is a genuine weakness worth
 * training against. Centralized here so this number is never hardcoded or
 * duplicated anywhere else in the app.
 *
 *   score <  THRESHOLD -> recommend
 *   score >= THRESHOLD -> no recommendation
 *   score === null     -> no recommendation (ungradeable, never guessed at)
 */
export const AI_TRAINING_RECOMMENDATION_THRESHOLD = 6;

/** Never show more than this many training clips on one analysis. */
export const MAX_RECOMMENDATIONS = 4;

/**
 * Category -> the skill tags a training_resources row must carry (any one
 * match is enough) to be eligible as a recommendation for that weakness.
 * Each category's own key is always included, so a resource tagged with
 * nothing more than the exact rubric key still matches.
 */
export const CATEGORY_SKILL_TAGS: Record<CategoryKey, string[]> = {
  setup_stance: ['setup_stance', 'shooting-stance', 'shot-preparation'],
  weight_transfer: ['weight_transfer', 'lower-body-loading', 'shooting-power'],
  lower_body: ['lower_body', 'leg-drive', 'weight_transfer'],
  hip_rotation: ['hip_rotation', 'rotational-power', 'shooting-power'],
  shoulder_rotation: ['shoulder_rotation', 'upper-body-rotation', 'shooting'],
  stick_loading: ['stick_loading', 'flex-loading', 'shooting-power'],
  hand_position: ['hand_position', 'shooting', 'release-control'],
  release_mechanics: ['release_mechanics', 'quick-release', 'shooting'],
  follow_through: ['follow_through', 'shot-direction', 'shot-completion'],
  balance_stability: ['balance_stability', 'shooting-balance', 'lower-body'],
};

/** Short, player-facing label for the "Improve Your ___" heading. */
export const CATEGORY_SHORT_LABEL: Record<CategoryKey, string> = {
  setup_stance: 'Stance',
  weight_transfer: 'Weight Transfer',
  lower_body: 'Lower-Body Mechanics',
  hip_rotation: 'Hip Rotation',
  shoulder_rotation: 'Shoulder Rotation',
  stick_loading: 'Stick Loading',
  hand_position: 'Hand Position',
  release_mechanics: 'Release',
  follow_through: 'Follow-Through',
  balance_stability: 'Balance',
};

export interface WeakCategory {
  key: CategoryKey;
  score: number;
}

/**
 * Every gradeable category below the threshold, weakest first. A `null`
 * score (insufficient footage) is never included — there is nothing honest
 * to recommend against a category the footage couldn't support.
 */
export function getWeakCategories(
  categories: CategoryScore[],
  threshold: number = AI_TRAINING_RECOMMENDATION_THRESHOLD
): WeakCategory[] {
  return categories
    .filter((c): c is CategoryScore & { score: number } => c.score !== null && c.score < threshold)
    .map((c) => ({ key: c.key, score: c.score }))
    .sort((a, b) => a.score - b.score);
}

/** The deduplicated union of tags worth querying for, across every weak category. */
export function tagsForWeakCategories(weak: WeakCategory[]): string[] {
  const tags = new Set<string>();
  for (const w of weak) {
    for (const t of CATEGORY_SKILL_TAGS[w.key] ?? []) tags.add(t);
  }
  return [...tags];
}

/** The minimal shape this module needs from a training_resources candidate row. */
export interface RecommendableResource {
  id: string;
  title: string;
  skillTags: string[];
  requiredTier?: Tier;
  /** Whether this player's current entitlement can actually open it. */
  locked?: boolean;
}

export interface Recommendation {
  resourceId: string;
  title: string;
  score: number;
  category: CategoryKey;
  categoryLabel: string;
  reason: string;
  requiredTier: Tier;
  locked: boolean;
}

/**
 * Maps weak categories onto candidate resources: weakest category first,
 * one resource per category, deduplicated by resource id (a resource
 * matching two weaknesses is attributed to the weaker one and only appears
 * once), capped at `max` total.
 *
 * `resources` should already be pre-filtered to what exists and is
 * queryable for this player (published, tag-overlapping) — this function
 * makes no access decisions of its own, it only ranks and deduplicates. An
 * unknown/unmapped tag on a candidate resource is simply never matched; it
 * can never crash this function.
 */
export function buildRecommendations(
  weak: WeakCategory[],
  resources: RecommendableResource[],
  max: number = MAX_RECOMMENDATIONS
): Recommendation[] {
  const used = new Set<string>();
  const out: Recommendation[] = [];

  for (const w of weak) {
    if (out.length >= max) break;
    const tags = CATEGORY_SKILL_TAGS[w.key] ?? [];
    const match = resources.find(
      (r) => !used.has(r.id) && r.skillTags.some((t) => tags.includes(t))
    );
    if (!match) continue;
    used.add(match.id);
    const label = CATEGORY_SHORT_LABEL[w.key] ?? RUBRIC_BY_CATEGORY[w.key]?.label ?? w.key;
    out.push({
      resourceId: match.id,
      title: match.title,
      score: w.score,
      category: w.key,
      categoryLabel: label,
      reason: `Your ${label.toLowerCase()} scored ${w.score}/10.`,
      requiredTier: match.requiredTier ?? 'basic',
      locked: match.locked ?? false,
    });
  }

  return out;
}
