/* ==========================================================================
   AI SHOT ANALYSIS CREDIT/QUOTA LOGIC — TESTS

   Run with:  node --experimental-strip-types --test lib/ai/quota.test.ts
   (Same Node built-in test runner convention as lib/permissions.test.ts and
   lib/customPlan.test.ts — no new dependency.)

   SCOPE: currentWindow() is the one pure, DB-free function in lib/ai/quota.ts
   — reserveAnalysis()/commitReservation()/releaseReservation() all require a
   live Supabase admin client and are exercised instead by integration/manual
   verification (see the final report for what was checked against
   production). This file guards the exact invariant that makes the reserve
   step race-safe and unforgeable:

     1. The window END must always sit strictly AFTER `now` — never AT or
        BEFORE it. reserveAnalysis() counts reservations with
        `created_at < <this row's created_at>` inside `[start, end)` to
        decide whether the limit is already hit; a window ending at-or-before
        `now` would exclude the very row just inserted, making every count
        zero and the limit unenforceable — i.e. a forged/blank
        accountCreatedAt would hand out unlimited analyses. This is the exact
        bypass currentWindow()'s doc comment calls out.
     2. A missing/unparseable/future anchor must fall back to a window that
        is never MORE generous than a correctly anchored one (same length,
        never a larger allowance).
     3. The anchored path is real modular arithmetic against account
        creation, not "now - 7 days" — so a member's reset day is stable
        across the whole week rather than sliding on every request.
   ========================================================================== */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentWindow } from './quota';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS = 7 * DAY_MS;

test('currentWindow: window end is always strictly after `now` (anti-bypass invariant)', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  // Anchored path.
  const anchored = currentWindow('2026-06-01T00:00:00.000Z', now);
  assert.ok(anchored.end.getTime() > now.getTime(), 'anchored window must end after now');

  // No anchor at all.
  const noAnchor = currentWindow(null, now);
  assert.ok(noAnchor.end.getTime() > now.getTime(), 'fallback window must end after now');

  // Unparseable anchor.
  const badAnchor = currentWindow('not-a-date', now);
  assert.ok(badAnchor.end.getTime() > now.getTime(), 'unparseable-anchor window must end after now');

  // Anchor in the future (forged/clock-skewed input).
  const futureAnchor = currentWindow('2099-01-01T00:00:00.000Z', now);
  assert.ok(futureAnchor.end.getTime() > now.getTime(), 'future-anchor window must end after now');
});

test('currentWindow: anchored path is exact modular arithmetic from account creation', () => {
  const anchor = '2026-01-01T00:00:00.000Z';
  const anchorMs = new Date(anchor).getTime();

  // Exactly 10 full periods (70 days) after account creation.
  const now = new Date(anchorMs + 10 * PERIOD_MS + DAY_MS); // 1 day into period 11
  const win = currentWindow(anchor, now);

  assert.equal(win.start.getTime(), anchorMs + 10 * PERIOD_MS);
  assert.equal(win.end.getTime(), anchorMs + 11 * PERIOD_MS);
  assert.equal(win.end.getTime() - win.start.getTime(), PERIOD_MS);
});

test('currentWindow: missing/bad/future anchor all fall back to the same shape (never more generous)', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  const variants = [
    currentWindow(null, now),
    currentWindow(undefined, now),
    currentWindow('', now),
    currentWindow('garbage', now),
    currentWindow('2099-01-01T00:00:00.000Z', now),
  ];

  for (const win of variants) {
    assert.equal(win.start.getTime(), now.getTime() - PERIOD_MS);
    assert.equal(win.end.getTime(), now.getTime() + PERIOD_MS);
  }
});

test('currentWindow: a member exactly at a period boundary rolls into the new period, not the old one', () => {
  const anchor = '2026-01-01T00:00:00.000Z';
  const anchorMs = new Date(anchor).getTime();
  const now = new Date(anchorMs + PERIOD_MS); // exactly one full period later

  const win = currentWindow(anchor, now);
  assert.equal(win.start.getTime(), anchorMs + PERIOD_MS);
  assert.equal(win.end.getTime(), anchorMs + 2 * PERIOD_MS);
});
