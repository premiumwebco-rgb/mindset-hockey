/* ==========================================================================
   CUSTOM PLAN PRICING — TESTS

   Run with:  node --experimental-strip-types --test lib/customPlan.test.ts
   (Same Node built-in test runner convention as lib/permissions.test.ts.)

   Covers the exact verification matrix from the product spec: every Standard
   Options count 0-6, every Personalized Options combination called out
   (Meal only, Workout only, Meal+Workout, 1/2/3 "other" coaching options,
   Meal+1 other, Workout+1 other, Meal+Workout+1 other), and the combined
   total from the worked example (3 Standard + Meal + Workout + 1 other =
   $214/month). Also guards priceCustomPlan()'s dedup/unknown-key handling,
   since that is what stands between a client-supplied option list and an
   inflated price.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  standardPriceCents,
  personalizedPriceCents,
  priceCustomPlan,
  isValidStandardKey,
  isValidPersonalizedKey,
} from './customPlan';
import { MEMBERSHIP_PERMISSIONS, CUSTOM_COACHING_SERVICES } from './permissions';

test('standardPriceCents: 0-6 selections match the exact published scale', () => {
  const expected = [0, 2400, 2900, 3400, 3900, 4400, 4900];
  for (let n = 0; n <= 6; n++) {
    assert.equal(standardPriceCents(n), expected[n], `${n} standard option(s)`);
  }
});

test('standardPriceCents: clamps negative/non-finite counts to 0', () => {
  assert.equal(standardPriceCents(-3), 0);
  assert.equal(standardPriceCents(NaN), 0);
});

test('personalizedPriceCents: Meal Plan only = $40', () => {
  assert.equal(personalizedPriceCents(['custom_nutrition_coaching']), 4000);
});

test('personalizedPriceCents: Workout Plan only = $40', () => {
  assert.equal(personalizedPriceCents(['custom_workout_programming']), 4000);
});

test('personalizedPriceCents: Meal + Workout = $80 (both flat, never escalate against each other)', () => {
  assert.equal(
    personalizedPriceCents(['custom_nutrition_coaching', 'custom_workout_programming']),
    8000
  );
});

test('personalizedPriceCents: 1/2/3 other coaching options follow the $100 first / +$20 each scale', () => {
  assert.equal(personalizedPriceCents(['one_on_one_coaching']), 10000);
  assert.equal(personalizedPriceCents(['one_on_one_coaching', 'weekly_checkins']), 12000);
  assert.equal(
    personalizedPriceCents(['one_on_one_coaching', 'weekly_checkins', 'video_reviews']),
    14000
  );
});

test('personalizedPriceCents: Meal/Workout + 1 other combine additively', () => {
  assert.equal(
    personalizedPriceCents(['custom_nutrition_coaching', 'one_on_one_coaching']),
    14000
  );
  assert.equal(
    personalizedPriceCents(['custom_workout_programming', 'one_on_one_coaching']),
    14000
  );
  assert.equal(
    personalizedPriceCents([
      'custom_nutrition_coaching',
      'custom_workout_programming',
      'one_on_one_coaching',
    ]),
    18000
  );
});

test('priceCustomPlan: worked example — 3 Standard + Meal + Workout + 1 other = $214/month', () => {
  const price = priceCustomPlan(
    [...MEMBERSHIP_PERMISSIONS].slice(0, 3),
    ['custom_nutrition_coaching', 'custom_workout_programming', 'one_on_one_coaching']
  );
  assert.equal(price.standardCents, 3400);
  assert.equal(price.personalizedCents, 18000);
  assert.equal(price.totalCents, 21400);
});

test('priceCustomPlan: dedupes repeated keys before pricing', () => {
  const price = priceCustomPlan(
    ['ai_shot_analysis', 'ai_shot_analysis', 'workouts'],
    ['custom_nutrition_coaching', 'custom_nutrition_coaching']
  );
  assert.equal(price.standardKeys.length, 2);
  assert.equal(price.standardCents, standardPriceCents(2));
  assert.equal(price.personalizedKeys.length, 1);
  assert.equal(price.personalizedCents, 4000);
});

test('priceCustomPlan: drops unknown/junk keys rather than pricing them', () => {
  const price = priceCustomPlan(
    ['ai_shot_analysis', 'not_a_real_permission'],
    ['one_on_one_coaching', 'made_up_service']
  );
  assert.deepEqual(price.standardKeys, ['ai_shot_analysis']);
  assert.deepEqual(price.personalizedKeys, ['one_on_one_coaching']);
  assert.equal(price.totalCents, standardPriceCents(1) + personalizedPriceCents(['one_on_one_coaching']));
});

test('priceCustomPlan: zero selections price to $0 total', () => {
  const price = priceCustomPlan([], []);
  assert.equal(price.totalCents, 0);
});

test('isValidStandardKey/isValidPersonalizedKey: exactly match the two catalogs, no overlap', () => {
  for (const key of MEMBERSHIP_PERMISSIONS) assert.equal(isValidStandardKey(key), true);
  for (const svc of CUSTOM_COACHING_SERVICES) assert.equal(isValidPersonalizedKey(svc.key), true);
  assert.equal(isValidStandardKey('one_on_one_coaching'), false);
  assert.equal(isValidPersonalizedKey('ai_shot_analysis'), false);
});
