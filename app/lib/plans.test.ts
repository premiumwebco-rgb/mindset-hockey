/* ==========================================================================
   OPEN FEATURES / FREE-PREVIEW GATING — TESTS

   Run with:  node --experimental-strip-types --test lib/plans.test.ts

   Guards the invariant the new "Custom" tab / free-preview feature depends
   on: workout_plans, nutrition_plans and mindset_training must stay in
   OPEN_FEATURES (reachable by every signed-in account, same as
   ai_shot_analysis already was) so a brand-new member can reach their 3 free
   meals/3 free workouts/1 free mindset lesson — the row-level entitlement
   check (Postgres RLS via required_tier) is what actually decides which
   content those pages return, this only guards the page-level gate.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_FEATURES, FEATURE_PERMISSION } from './plans';

test('OPEN_FEATURES includes the free-preview surfaces plus the pre-existing ai_shot_analysis', () => {
  for (const feature of ['ai_shot_analysis', 'workout_plans', 'nutrition_plans', 'mindset_training'] as const) {
    assert.ok(OPEN_FEATURES.has(feature), `expected OPEN_FEATURES to include '${feature}'`);
  }
});

test('every open feature still resolves to a real permission key (nothing here bypasses RLS mapping)', () => {
  for (const feature of OPEN_FEATURES) {
    if (feature === 'ai_shot_analysis') continue; // has its own credit-based gate, not a permission mapping
    assert.ok(
      FEATURE_PERMISSION[feature],
      `expected FEATURE_PERMISSION['${feature}'] to be defined`
    );
  }
});
