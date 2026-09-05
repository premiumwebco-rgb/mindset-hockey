import { MEMBERSHIP_PERMISSIONS, CUSTOM_COACHING_SERVICES, type MembershipPermission } from './permissions';

/* ==========================================================================
   CUSTOM PLAN PRICING

   THE ONE PLACE a Custom Plan's dollar amounts are computed. Imported by
   BOTH the client (RequestPlanForm's live price preview) and the server
   (app/api/stripe/custom-plan/checkout/route.ts and the webhook's
   grantCustomPlan() in app/api/stripe/webhook/route.ts).

   Sharing this module with the client is safe BECAUSE the checkout route
   never trusts a price the client sends — it only ever accepts the selected
   option KEYS and recomputes the price itself by calling priceCustomPlan()
   again, server-side. A tampered client bundle can change what a customer
   *sees* in the live preview; it cannot change what Stripe actually charges,
   because the charge is built from the server's own re-computation, not from
   anything the browser reports.

   PRICING RULES (verbatim from product spec):
     Standard Options   0 selected = $0/mo; first = $24/mo; each additional
       = +$5/mo (1=$24, 2=$29, 3=$34, 4=$39, 5=$44, 6=$49). These are exactly
       the 6 MEMBERSHIP_PERMISSIONS (lib/permissions.ts) — selecting all 6
       costs the same $49/mo as the flat Mindset Hockey Membership plan.
     Personalized Options   "Meal Plan" (custom_nutrition_coaching) and
       "Workout Plan" (custom_workout_programming) are each a flat $40/mo,
       always — never the escalating rule below. Every OTHER personalized/
       coaching option (the remaining CUSTOM_COACHING_SERVICES entries) is
       priced on an escalating scale: first selected = $100/mo, each
       additional = +$20/mo. The two pricing pools are independent — buying
       Meal Plan does not count toward the "first/additional" count for the
       escalating pool, and vice versa.
   ========================================================================== */

/** Personalized keys billed as a flat $40/month, never the escalating scale. */
export const FLAT_PERSONALIZED_KEYS: ReadonlySet<string> = new Set([
  'custom_nutrition_coaching', // "Meal Plan"
  'custom_workout_programming', // "Workout Plan"
]);
const FLAT_PERSONALIZED_PRICE_CENTS = 4000;

/** Every other personalized/coaching key: first = $100/mo, +$20/mo each additional. */
const ESCALATING_FIRST_CENTS = 10000;
const ESCALATING_STEP_CENTS = 2000;

const VALID_STANDARD_KEYS = new Set<string>(MEMBERSHIP_PERMISSIONS);
const VALID_PERSONALIZED_KEYS = new Set<string>(CUSTOM_COACHING_SERVICES.map((s) => s.key));

export function isValidStandardKey(key: string): key is MembershipPermission {
  return VALID_STANDARD_KEYS.has(key);
}

export function isValidPersonalizedKey(key: string): boolean {
  return VALID_PERSONALIZED_KEYS.has(key);
}

/** 0 selections = $0; first = $24/mo; each additional = +$5/mo. */
export function standardPriceCents(selectedCount: number): number {
  const n = Number.isFinite(selectedCount) ? Math.max(0, Math.floor(selectedCount)) : 0;
  if (n === 0) return 0;
  return 2400 + (n - 1) * 500;
}

/**
 * Meal/Workout Plan are flat $40 each; every other selected personalized key
 * feeds one shared escalating pool (first = $100, +$20 each additional).
 * Unknown keys are ignored here — callers should filter with
 * isValidPersonalizedKey()/priceCustomPlan() first.
 */
export function personalizedPriceCents(selectedKeys: readonly string[]): number {
  let total = 0;
  let escalatingCount = 0;
  for (const key of selectedKeys) {
    if (FLAT_PERSONALIZED_KEYS.has(key)) total += FLAT_PERSONALIZED_PRICE_CENTS;
    else escalatingCount += 1;
  }
  if (escalatingCount > 0) total += ESCALATING_FIRST_CENTS + (escalatingCount - 1) * ESCALATING_STEP_CENTS;
  return total;
}

export interface CustomPlanPrice {
  /** Deduped, validated selections actually priced — junk/duplicate/unknown keys dropped. */
  standardKeys: string[];
  personalizedKeys: string[];
  standardCents: number;
  personalizedCents: number;
  totalCents: number;
}

/**
 * THE SINGLE PRICING FUNCTION. Dedupes and drops unknown keys before pricing
 * so a hand-crafted request body (or a stale client bundle) cannot inflate
 * the count with junk or duplicate entries — the server-side caller of this
 * function is the only source of truth for what a selection costs.
 */
export function priceCustomPlan(
  standardKeysIn: readonly string[],
  personalizedKeysIn: readonly string[]
): CustomPlanPrice {
  const standardKeys = [...new Set(standardKeysIn)].filter(isValidStandardKey);
  const personalizedKeys = [...new Set(personalizedKeysIn)].filter(isValidPersonalizedKey);
  const standardCents = standardPriceCents(standardKeys.length);
  const personalizedCents = personalizedPriceCents(personalizedKeys);
  return {
    standardKeys,
    personalizedKeys,
    standardCents,
    personalizedCents,
    totalCents: standardCents + personalizedCents,
  };
}

/** Display helper so no template hand-formats cents into dollars differently. */
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
