/* ==========================================================================
   AI TRAINING RECOMMENDATIONS — TESTS

   Run with:  node --experimental-strip-types --test app/lib/ai/recommendations.test.ts
   (No test framework is installed in this repo and this sandbox has no
   package-registry network access, so these use Node's built-in test
   runner — zero new dependencies, zero package.json changes required.)

   Scope: these exercise the PURE ranking functions in recommendations.ts
   only (getWeakCategories / buildRecommendations), by design — that file
   has no Supabase or session imports, so it can be tested without a
   database. The DB-facing half of this feature (getRecommendableResources
   in lib/library.ts: is_published filtering, tier-based locking, RLS) is
   not exercised here because it requires a live Supabase connection this
   sandbox does not have network access to. That half reuses the exact
   same query pattern as the already-working getLibrary()/buildLibraryView(),
   verified by code reading rather than a new automated test — this is
   called out explicitly in the Phase 4 report rather than silently assumed.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_TRAINING_RECOMMENDATION_THRESHOLD,
  MAX_RECOMMENDATIONS,
  getWeakCategories,
  buildRecommendations,
  type RecommendableResource,
} from './recommendations';
import type { CategoryKey, CategoryScore } from './rubric';

/** Builds a minimal-but-valid CategoryScore for a given key/score. */
function cat(key: CategoryKey, score: number | null): CategoryScore {
  return {
    key,
    score,
    status: score === null ? 'insufficient_footage' : 'scored',
    confidence: 'high',
    basis: score === null ? 'unable_to_evaluate' : 'observed',
    observation: 'test fixture',
    strength: null,
    improvement: null,
  };
}

function resource(id: string, tags: string[], overrides: Partial<RecommendableResource> = {}): RecommendableResource {
  return { id, title: `Resource ${id}`, skillTags: tags, ...overrides };
}

const ALL_CATEGORIES: CategoryKey[] = [
  'setup_stance',
  'weight_transfer',
  'lower_body',
  'hip_rotation',
  'shoulder_rotation',
  'stick_loading',
  'hand_position',
  'release_mechanics',
  'follow_through',
  'balance_stability',
];

test('1. all categories 7-10 -> zero recommendations', () => {
  const categories = ALL_CATEGORIES.map((k, i) => cat(k, 7 + (i % 4)));
  const weak = getWeakCategories(categories);
  assert.equal(weak.length, 0);
  assert.deepEqual(buildRecommendations(weak, [resource('r1', ['release_mechanics'])]), []);
});

test('2. one category at 5 -> one matching recommendation', () => {
  const categories = [cat('release_mechanics', 5), cat('follow_through', 9)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, [resource('r1', ['release_mechanics'])]);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].resourceId, 'r1');
  assert.equal(recs[0].category, 'release_mechanics');
  assert.equal(recs[0].score, 5);
});

test('3. a 4/10 and a 5/10 -> the 4/10 recommendation appears first', () => {
  const categories = [cat('release_mechanics', 5), cat('balance_stability', 4)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, [
    resource('rel', ['release_mechanics']),
    resource('bal', ['balance_stability']),
  ]);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].category, 'balance_stability');
  assert.equal(recs[0].score, 4);
  assert.equal(recs[1].category, 'release_mechanics');
  assert.equal(recs[1].score, 5);
});

test('4. category score exactly at the threshold (6) -> no recommendation', () => {
  const categories = [cat('release_mechanics', AI_TRAINING_RECOMMENDATION_THRESHOLD)];
  const weak = getWeakCategories(categories);
  assert.equal(weak.length, 0);
});

test('5. null score -> no recommendation, never treated as a weakness', () => {
  const categories = [cat('release_mechanics', null), cat('follow_through', 9)];
  const weak = getWeakCategories(categories);
  assert.equal(weak.length, 0);
});

test('6. two weak categories mapping to the same video -> video appears once', () => {
  // release_mechanics and hand_position both include the 'shooting' tag.
  const categories = [cat('hand_position', 3), cat('release_mechanics', 5)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, [resource('shared', ['shooting'])]);
  assert.equal(recs.length, 1);
  // Weakest category (hand_position, score 3) claims the shared resource.
  assert.equal(recs[0].category, 'hand_position');
  assert.equal(recs[0].resourceId, 'shared');
});

test('7. five+ weak categories -> maximum 4 recommendations', () => {
  const categories: CategoryScore[] = [
    cat('setup_stance', 1),
    cat('weight_transfer', 2),
    cat('lower_body', 3),
    cat('hip_rotation', 4),
    cat('shoulder_rotation', 5),
  ];
  const weak = getWeakCategories(categories);
  assert.equal(weak.length, 5);
  const resources = [
    resource('r1', ['setup_stance']),
    resource('r2', ['weight_transfer']),
    resource('r3', ['lower_body']),
    resource('r4', ['hip_rotation']),
    resource('r5', ['shoulder_rotation']),
  ];
  const recs = buildRecommendations(weak, resources);
  assert.equal(recs.length, MAX_RECOMMENDATIONS);
  assert.equal(recs.length <= 4, true);
});

test('8. a resource not present in the candidate list is never recommended (unpublished simulation)', () => {
  // getRecommendableResources() only ever returns is_published=true rows —
  // an unpublished resource simply never appears in `resources` here. This
  // proves buildRecommendations() cannot manufacture a recommendation for
  // anything it wasn't given.
  const categories = [cat('release_mechanics', 4)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, [] /* unpublished resource excluded upstream */);
  assert.equal(recs.length, 0);
});

test('9. archived-equivalent resource never recommended (simulated by omission)', () => {
  // training_resources has no separate "archived" flag — only is_published.
  // "Archived" and "unpublished" are the same state at the schema level, so
  // this is the same guarantee as test 8, exercised again for the distinct
  // scenario the spec names.
  const categories = [cat('balance_stability', 2)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, []);
  assert.equal(recs.length, 0);
});

test('10. a locked (premium-required) resource is still recommended, flagged locked — never bypassed', () => {
  const categories = [cat('release_mechanics', 5)];
  const weak = getWeakCategories(categories);
  const recs = buildRecommendations(weak, [
    resource('premium1', ['release_mechanics'], { requiredTier: 'premium', locked: true }),
  ]);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].locked, true);
  assert.equal(recs[0].requiredTier, 'premium');
});

test('11. an unknown/unmapped tag on a candidate resource never crashes and never matches', () => {
  const categories = [cat('release_mechanics', 5)];
  const weak = getWeakCategories(categories);
  assert.doesNotThrow(() => {
    const recs = buildRecommendations(weak, [resource('weird', ['totally-unrelated-tag'])]);
    assert.equal(recs.length, 0);
  });
});

test('12. buildRecommendations never throws on an empty weak list or empty resource list', () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(buildRecommendations([], []), []);
    assert.deepEqual(buildRecommendations([], [resource('r1', ['release_mechanics'])]), []);
  });
  // The corresponding page-level guarantee — that a missing/failed
  // recommendation computation still renders the rest of the analysis —
  // is structural (try/catch in analysis/[id]/page.tsx around the calls
  // into this module) rather than something a Node-runner unit test can
  // exercise against a Next.js Server Component.
});
