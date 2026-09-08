/* ==========================================================================
   CUSTOM PLAN PRICING — TESTS

   Run with:  node --experimental-strip-types --test lib/customPlan.test.ts

   Covers the current 4-option pricing scale (0=$0, 1=$20, 2=$30, 3=$40,
   4=$50 — first option $20/mo, each additional +$10/mo), guards that only
   the 4 CUSTOM_COACHING_SERVICES keys price at all (an unknown/retired key
   is dropped, never inflates the total), and keeps a regression test for the
   retired Standard-Options scale (standardPriceCents) since that plumbing is
   intentionally left in place for historical purchases — see lib/customPlan.ts.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  standardPriceCents,
  personalizedPriceCents,
  priceCustomPlan,
  isValidStandardKey,
  isValidPersonalizedKey,
  CUSTOM_PLAN_BASE_CENTS,
  CUSTOM_PLAN_ADDITIONAL_CENTS,
} from './customPlan';
import { MEMBERSHIP_PERMISSIONS, CUSTOM_COACHING_SERVICES } from './permissions';

test('CUSTOM_COACHING_SERVICES catalog is exactly the 4 current options', () => {
  const keys = CUSTOM_COACHING_SERVICES.map((s) => s.key).sort();
  assert.deepEqual(keys, [
    'custom_nutrition_coaching',
    'custom_workout_programming',
    'video_reviews',
    'weekly_checkins',
  ]);
});

test('personalizedPriceCents: 0-4 selections match the exact published scale', () => {
  const expected = [0, 2000, 3000, 4000, 5000];
  for (let n = 0; n <= 4; n++) {
    const keys = CUSTOM_COACHING_SERVICES.slice(0, n).map((s) => s.key);
    assert.equal(personalizedPriceCents(keys), expected[n], `${n} option(s)`);
  }
});

test('personalizedPriceCents: base/additional constants match the published $20/+$10 scale', () => {
  assert.equal(CUSTOM_PLAN_BASE_CENTS, 2000);
  assert.equal(CUSTOM_PLAN_ADDITIONAL_CENTS, 1000);
});

test('personalizedPriceCents: price depends only on COUNT, never on which options are selected', () => {
  const anyTwo = personalizedPriceCents(['weekly_checkins', 'video_reviews']);
  const anyOtherTwo = personalizedPriceCents(['custom_workout_programming', 'custom_nutrition_coaching']);
  assert.equal(anyTwo, anyOtherTwo);
  assert.equal(anyTwo, 3000);
});

test('isValidPersonalizedKey: true for all 4 current options, false for retired/unknown keys', () => {
  for (const svc of CUSTOM_COACHING_SERVICES) assert.equal(isValidPersonalizedKey(svc.key), true);
  for (const retired of [
    'one_on_one_coaching',
    'direct_messaging',
    'personalized_development_plan',
    'in_person_sessions',
    'not_a_real_key',
  ]) {
    assert.equal(isValidPersonalizedKey(retired), false, `expected '${retired}' to be invalid`);
  }
});

test('priceCustomPlan: drops unknown/retired keys instead of pricing them', () => {
  const price = priceCustomPlan([], ['weekly_checkins', 'one_on_one_coaching', 'not_real']);
  assert.deepEqual(price.personalizedKeys, ['weekly_checkins']);
  assert.equal(price.personalizedCents, 2000);
  assert.equal(price.totalCents, 2000);
});

test('priceCustomPlan: dedupes a repeated key rather than charging it twice', () => {
  const price = priceCustomPlan([], ['video_reviews', 'video_reviews', 'video_reviews']);
  assert.deepEqual(price.personalizedKeys, ['video_reviews']);
  assert.equal(price.personalizedCents, 2000);
});

test('priceCustomPlan: all 4 options together price at exactly $50/mo (the worked example)', () => {
  const allKeys = CUSTOM_COACHING_SERVICES.map((s) => s.key);
  const price = priceCustomPlan([], allKeys);
  assert.equal(price.personalizedCents, 5000);
  assert.equal(price.totalCents, 5000);
});

test('priceCustomPlan: standardKeysIn is always priced to 0 in current practice (retired path, no live UI sends it)', () => {
  const price = priceCustomPlan([], ['weekly_checkins']);
  assert.deepEqual(price.standardKeys, []);
  assert.equal(price.standardCents, 0);
});

test('priceCustomPlan: zero selections of either kind price to exactly $0', () => {
  const price = priceCustomPlan([], []);
  assert.equal(price.totalCents, 0);
});

/* ---- regression coverage for the retired Standard-Options scale --------- */

test('standardPriceCents (retired path): 0-6 selections still match the historical published scale', () => {
  const expected = [0, 2400, 2900, 3400, 3900, 4400, 4900];
  for (let n = 0; n <= 6; n++) {
    assert.equal(standardPriceCents(n), expected[n], `${n} standard option(s)`);
  }
});

test('standardPriceCents: clamps negative/non-finite counts to 0', () => {
  assert.equal(standardPriceCents(-3), 0);
  assert.equal(standardPriceCents(NaN), 0);
});

test('isValidStandardKey: true for the 6 Membership permission keys, false otherwise', () => {
  for (const key of MEMBERSHIP_PERMISSIONS) assert.equal(isValidStandardKey(key), true);
  assert.equal(isValidStandardKey('weekly_checkins'), false);
  assert.equal(isValidStandardKey('not_real'), false);
});
