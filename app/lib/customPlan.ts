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

   PRICING RULES (current product spec):
     Every Custom Plan option (see CUSTOM_COACHING_SERVICES in
     lib/permissions.ts — exactly 4: Weekly Check-Ins, Video Reviews, Custom
     Workout Programming, Custom Nutrition Coaching) is priced from ONE flat
     scale: 0 selected = $0/mo; the FIRST selected option = $20/mo; each
     ADDITIONAL option = +$10/mo (1=$20, 2=$30, 3=$40, 4=$50 — selecting all
     four is the maximum, $50/mo). There is no per-option price difference —
     which option is first doesn't change the total, only how many are
     selected does.

     'Standard Options' (buying an individual Membership feature — workouts,
     nutrition, mindset, etc. — piecemeal rather than the full $49/mo
     Membership) is a RETIRED purchase path. The plumbing for it
     (standardKeys/standardCents, isValidStandardKey/standardPriceCents,
     and the corresponding columns on custom_plan_purchases) is left in
     place, unchanged, so historical purchases and the existing Stripe
     webhook/entitlement-preservation logic
     (activeCustomPlanStandardKeys()/applyEntitlement() in
     app/api/stripe/webhook/route.ts) keep working exactly as before — new
     purchases simply never populate it (the current UI never offers a
     Standard Option to select, so standardKeysIn is always empty in
     practice), which priceCustomPlan() below already handles safely (an
     empty list prices to $0, same as no selection).
   ========================================================================== */

/** 0 selections = $0; first = $24/mo; each additional = +$5/mo.
 *  Retained only for the retired Standard-Options purchase path — see the
 *  header comment above. No current UI offers a Standard Option to select. */
export function standardPriceCents(selectedCount: number): number {
  const n = Number.isFinite(selectedCount) ? Math.max(0, Math.floor(selectedCount)) : 0;
  if (n === 0) return 0;
  return 2400 + (n - 1) * 500;
}

const VALID_STANDARD_KEYS = new Set<string>(MEMBERSHIP_PERMISSIONS);
const VALID_OPTION_KEYS = new Set<string>(CUSTOM_COACHING_SERVICES.map((s) => s.key));

export function isValidStandardKey(key: string): key is MembershipPermission {
  return VALID_STANDARD_KEYS.has(key);
}

/** True for any of the 4 current Custom Plan options (CUSTOM_COACHING_SERVICES). */
export function isValidPersonalizedKey(key: string): boolean {
  return VALID_OPTION_KEYS.has(key);
}

/** The price shown for "starting at" copy — one option, nothing else selected. */
export const CUSTOM_PLAN_BASE_CENTS = 2000;
/** Cost of each option after the first. */
export const CUSTOM_PLAN_ADDITIONAL_CENTS = 1000;

/**
 * 0 selections = $0; first selected option = $20/mo; each additional = +$10/mo.
 * Unknown keys are ignored here — callers should filter with
 * isValidPersonalizedKey()/priceCustomPlan() first.
 */
export function personalizedPriceCents(selectedKeys: readonly string[]): number {
  const n = selectedKeys.length;
  if (n === 0) return 0;
  return CUSTOM_PLAN_BASE_CENTS + (n - 1) * CUSTOM_PLAN_ADDITIONAL_CENTS;
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
 *
 * standardKeysIn is retained for the retired Standard-Options path (see the
 * header comment) — the current UI always passes an empty array for it, so
 * standardCents is always 0 in practice, but the parameter itself is kept so
 * the checkout route and webhook (app/api/stripe/webhook/route.ts) don't
 * need to change shape.
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
