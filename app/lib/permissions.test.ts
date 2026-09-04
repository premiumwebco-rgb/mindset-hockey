/* ==========================================================================
   PERMISSION ENTITLEMENT CASCADE — TESTS

   Run with:  node --experimental-strip-types --test lib/permissions.test.ts
   (Same Node built-in test runner convention as lib/ai/recommendations.test.ts
   — no new dependency, no package.json change.)

   Scope: tierGrantsMembership() and membershipPermissionPatch() are pure
   functions with no Supabase/session imports, so they're testable without a
   database. These are the exact functions shared by the Stripe webhook's
   applyEntitlement() (app/api/stripe/webhook/route.ts) and the Admin > Users
   manual activate/deactivate route (app/api/admin/user/route.ts) — this test
   guards the invariant that motivated pulling them out: a member's 6
   Membership permission columns must always match tier+active the same way,
   regardless of which code path changed them.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMBERSHIP_PERMISSIONS,
  tierGrantsMembership,
  membershipPermissionPatch,
} from './permissions';

test('tierGrantsMembership: membership/basic/premium all count, none/null/undefined do not', () => {
  assert.equal(tierGrantsMembership('membership'), true);
  assert.equal(tierGrantsMembership('basic'), true);
  assert.equal(tierGrantsMembership('premium'), true);
  assert.equal(tierGrantsMembership('none'), false);
  assert.equal(tierGrantsMembership(null), false);
  assert.equal(tierGrantsMembership(undefined), false);
});

test('membershipPermissionPatch: grants every Membership permission when tier grants membership and active', () => {
  const patch = membershipPermissionPatch('membership', true);
  for (const key of MEMBERSHIP_PERMISSIONS) {
    assert.equal(patch[key], true, `expected ${key} to be granted`);
  }
});

test('membershipPermissionPatch: revokes every Membership permission when active is false, even on a membership tier', () => {
  const patch = membershipPermissionPatch('membership', false);
  for (const key of MEMBERSHIP_PERMISSIONS) {
    assert.equal(patch[key], false, `expected ${key} to be revoked`);
  }
});

test('membershipPermissionPatch: revokes every Membership permission when tier is none, even if active is true', () => {
  // Should never happen in practice (an inactive tier paired with active:true),
  // but the function must not accidentally grant on a non-membership tier.
  const patch = membershipPermissionPatch('none', true);
  for (const key of MEMBERSHIP_PERMISSIONS) {
    assert.equal(patch[key], false, `expected ${key} to be revoked for tier 'none'`);
  }
});

test('membershipPermissionPatch: legacy basic/premium tiers grant exactly like membership when active', () => {
  const membership = membershipPermissionPatch('membership', true);
  const basic = membershipPermissionPatch('basic', true);
  const premium = membershipPermissionPatch('premium', true);
  assert.deepEqual(basic, membership);
  assert.deepEqual(premium, membership);
});

test('membershipPermissionPatch: only touches the 6 Membership keys, never a Coaching key', () => {
  const patch = membershipPermissionPatch('membership', true);
  const keys = Object.keys(patch).sort();
  assert.deepEqual(keys, [...MEMBERSHIP_PERMISSIONS].sort());
});
