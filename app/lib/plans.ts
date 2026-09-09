import type { Tier } from './types';
import type { PermissionKey } from './permissions';

/* ==========================================================================
   Plans — must stay in lockstep with the public pricing page.

   Mindset Hockey Membership   $49/month, no setup fee — the ONLY self-serve
     plan. Includes every non-coaching category: AI Shot Analysis, Workout
     Plans, Nutrition & Meal Plans, Mindset Training, Training Video Library,
     Progress Tracking, and any future non-coaching educational content.
   Custom Coaching   quote-only, built from a-la-carte services selected on
     the "Request Custom Plan" form (see lib/permissions.ts). Never has a
     Stripe self-serve checkout — an admin sets it up after review.

   The old Standard ($249 + $100/mo) and Premium ($389 + $149/mo) plans are
   RETIRED. See lib/types.ts for why `Tier` still carries `basic`/`premium` as
   legacy values, and app/api/stripe/webhook/route.ts for how existing
   subscribers on those old Stripe prices are folded into `membership` without
   touching their actual billing.
   ========================================================================== */

/* --------------------------------------------------------------------------
   PLAN VOCABULARY — one canonical form, converted explicitly at the edges.

   CANONICAL (internal):  Tier — 'none' | 'basic' | 'premium' | 'membership'
     This is what the database enum `tier_t`, `profiles.tier` and
     `session.tier` speak. It records the billing relationship, nothing more —
     WHAT a member can see is decided by permissions (lib/permissions.ts), not
     by comparing tiers.

   PUBLIC (URLs + API bodies):  PlanSlug — 'membership'
     This is what a member sees.

   The two vocabularies meet in exactly ONE place: `planFromParam()`. Every
   route boundary that receives a plan from outside (a query string, a JSON
   body) must go through it.
-------------------------------------------------------------------------- */
export type PlanSlug = 'membership';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  tier: Tier;
  slug: PlanSlug;
  name: string;
  tagline: string;
  who: string;
  /** One-time onboarding fee, in dollars. Membership has none. */
  setupFee: number;
  /** Recurring monthly fee, in dollars. */
  monthly: number;
  featured?: boolean;
  cta: string;
  /** Stripe Price ID for the recurring subscription line. */
  priceIdMonthly?: string;
  /** Stripe Price ID for a one-time setup line, if this plan has one. */
  priceIdSetup?: string;
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    tier: 'membership',
    slug: 'membership',
    name: 'Mindset Hockey Membership',
    tagline: 'Full platform access for one monthly price.',
    who: 'Every athlete who wants the complete non-coaching system — no tiers, no add-ons to think about.',
    setupFee: 0,
    monthly: 49,
    featured: true,
    cta: 'Join for $49/month',
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MEMBERSHIP_MONTHLY,
    features: [
      { label: 'AI Shot Analysis', included: true },
      { label: 'Workout Plans', included: true },
      { label: 'Nutrition & Meal Plans', included: true },
      { label: 'Mindset Training', included: true },
      { label: 'Training Video Library', included: true },
      { label: 'Progress Tracking', included: true },
      { label: 'Performance Resources', included: true },
      { label: 'Any future non-coaching educational content', included: true },
    ],
  },
];

export const PLAN_BY_SLUG: Record<string, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.slug, p])
);

export function planForTier(tier: Tier): Plan | undefined {
  // Legacy tiers resolve to the Membership plan for display purposes — there
  // is nothing else to show them as anymore.
  if (tier === 'basic' || tier === 'premium') return PLAN_BY_SLUG.membership;
  return PLANS.find((p) => p.tier === tier);
}

/**
 * THE ONLY BRIDGE BETWEEN THE PUBLIC AND CANONICAL VOCABULARIES.
 *
 * Accepts whatever arrived from outside — a `?plan=` query string, a JSON body
 * — and resolves it to a Plan, or `undefined` if it is not a real plan.
 *
 * Legacy aliases ('standard', 'basic', 'premium') resolve to the single
 * Membership plan so old links and bookmarks do not dead-end. `'none'` is not
 * a purchasable plan and is rejected, and `'custom'` is deliberately NOT
 * resolved here — Custom Coaching has no Stripe checkout, see
 * /coaching/request instead.
 */
export function planFromParam(param: string | null | undefined): Plan | undefined {
  if (!param) return undefined;
  const key = param.trim().toLowerCase();
  if (key === 'standard' || key === 'basic' || key === 'premium' || key === 'membership') {
    return PLAN_BY_SLUG.membership;
  }
  return PLANS.find((p) => p.slug === key);
}

/** Private on-ice coaching, billed per session rather than by subscription. */
export const ON_ICE_SESSION = {
  price: 149,
  label: 'Private On-Ice Session',
  cta: 'Book a Private Session',
  includes: [
    'Shooting development',
    'Stickhandling',
    'Skating work',
    'Hockey IQ development',
    'Position-specific coaching',
    'Immediate feedback',
  ],
};

/** Founding-member offer: monthly rate locked for as long as they stay. */
export const FOUNDING_MEMBER = {
  headline: 'Founding Member',
  body:
    'The first athletes who join Mindset Hockey lock in their monthly membership rate ' +
    'for life. As the program grows, future pricing may increase — founding members keep ' +
    'their original monthly rate.',
  short: 'Lock in this monthly rate for life',
};

/* --------------------------------------------------------------------------
   Feature gate map — LEGACY COMPATIBILITY SHIM.

   `Feature`/`FEATURE_MIN_TIER` are what every page guard (`requireFeature`,
   `canUse`, `hasTier`) in this app was written against. Rather than touch the
   ~20 call sites across the app, `canUse()` in lib/session.ts now resolves a
   Feature to a PermissionKey via `FEATURE_PERMISSION` below and checks the
   member's actual permission columns — `FEATURE_MIN_TIER` is kept only for
   any code that still reads it directly (e.g. legacy upgrade-prompt copy) and
   is no longer the source of truth for access. The database's real boundary
   is `auth_has_permission()` in Postgres; see the RLS policies.
-------------------------------------------------------------------------- */
export type Feature =
  | 'dashboard'
  | 'basic_resources'
  | 'basic_tracking'
  | 'monthly_content'
  | 'workout_plans'
  | 'ai_shot_analysis'
  | 'nutrition_plans'
  | 'mindset_training'
  | 'video_review'
  | 'weekly_checkins'
  | 'custom_workout_programming'
  | 'custom_nutrition_coaching'
  | 'advanced_tracking'
  | 'priority_support';

/** Retained for display/legacy purposes only — see the note above. */
export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  dashboard: 'membership',
  basic_resources: 'membership',
  basic_tracking: 'membership',
  monthly_content: 'membership',
  workout_plans: 'membership',
  ai_shot_analysis: 'none',
  nutrition_plans: 'membership',
  mindset_training: 'membership',
  video_review: 'membership',
  weekly_checkins: 'membership',
  custom_workout_programming: 'membership',
  custom_nutrition_coaching: 'membership',
  advanced_tracking: 'membership',
  priority_support: 'membership',
};

/**
 * The real, permission-backed mapping `canUse()` uses. A Feature absent here
 * (`dashboard`, `monthly_content`, `priority_support`) has no single-category
 * permission of its own — it is available to anyone with an active
 * membership, mirroring what "basic" used to mean.
 */
export const FEATURE_PERMISSION: Partial<Record<Feature, PermissionKey>> = {
  basic_resources: 'video_library',
  workout_plans: 'workouts',
  nutrition_plans: 'nutrition',
  mindset_training: 'mindset',
  video_review: 'video_reviews',
  // The other 3 Personalized Plan tabs — same relatedPermission mapping as
  // CUSTOM_COACHING_SERVICES in lib/permissions.ts (custom_workout_programming
  // and custom_nutrition_coaching share the single custom_programming column,
  // exactly like the Build Your Plan catalog they were split out of).
  weekly_checkins: 'weekly_checkins',
  custom_workout_programming: 'custom_programming',
  custom_nutrition_coaching: 'custom_programming',
  basic_tracking: 'progress_tracking',
  advanced_tracking: 'progress_tracking',
};

/**
 * Features reachable by EVERY signed-in account, including free ones — a new
 * member gets 3 free analyses and must be able to use them. This is a UX gate
 * only: the real boundary is the entitlement reservation in lib/ai/quota.ts
 * plus the RLS policies, which require either the `ai_shot_analysis`
 * permission OR an unspent credit. A free member with 0 credits still reaches
 * the page and is shown the upgrade options rather than being bounced away.
 */
export const OPEN_FEATURES = new Set<Feature>([
  'ai_shot_analysis',
  // Free-preview surfaces (see supabase/migrations/0023): a brand-new member
  // with no purchase gets exactly 3 free meals, 3 free workouts and 1 free
  // mindset lesson, marked required_tier='none' on their content rows. The
  // page itself must therefore be reachable by every signed-in account —
  // the real boundary is Postgres RLS (auth_has_tier(required_tier)), same
  // pattern as ai_shot_analysis above.
  'workout_plans',
  'nutrition_plans',
  'mindset_training',
]);

/* --------------------------------------------------------------------------
   AI SHOT ANALYSIS — WEEKLY ALLOWANCE

   THE ONLY PLACE THESE NUMBERS LIVE. To move Basic 3 -> 5 and Premium 6 -> 10,
   edit the two numbers below and nothing else. The API limit, the enforcement,
   the "2 of 3 used this week" counter and the exhausted-allowance message all
   read from here.

   WEEKLY, NOT MONTHLY. AI Shot Analysis is a weekly coaching rhythm: film a
   session, get it graded, work on it, film again. That cadence is deliberately
   decoupled from Stripe. Stripe answers "is this subscription active and what
   tier is it?" — nothing more. This answers "how many analyses does that tier
   include per week?". A monthly invoice does not reset the weekly allowance.

   FUTURE ADD-ONS. `weeklyAiAllowance()` returns the INCLUDED allowance. When
   purchased top-ups arrive, they become a separate additive term
   (included + purchased = total) rather than an edit to these numbers, so the
   entitlement architecture already supports it. Nothing here needs to change.
-------------------------------------------------------------------------- */

/** Included AI Shot Analyses per rolling 7-day period, by tier. */
export const AI_ANALYSIS_LIMITS: Record<Tier, number> = {
  none: 0,
  basic: 10, // Standard (legacy)
  premium: 20, // Premium (legacy)
  membership: 20, // Mindset Hockey Membership — full allowance for everyone
};

/* --------------------------------------------------------------------------
   PAID ADD-ON — one extra AI Shot Analysis

   A one-time purchase, deliberately NOT a subscription change. Buying an
   add-on must never touch profiles.tier or subscription_active.

   The amount below is the SERVER'S definition of the product and is what the
   checkout route validates the configured Stripe price against. The client
   never supplies a price, amount, quantity or user id — see
   app/api/analysis/purchase/route.ts.
-------------------------------------------------------------------------- */
export const ANALYSIS_ADDON = {
  /** Cents. Compared against the Stripe price before any session is created. */
  amountCents: 50,
  currency: 'usd',
  /** Exactly one analysis per purchase. One click = one analysis. */
  quantity: 1,
  label: 'One AI Shot Analysis',
  /** Display helper so no template hardcodes "$0.50". */
  get display(): string {
    return `$${(this.amountCents / 100).toFixed(2)}`;
  },
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANALYSIS_ADDON,
} as const;

/**
 * Whether add-ons can actually be sold right now.
 *
 * Stripe is not fully configured yet. Without a price id the purchase route
 * refuses with 503, so showing a live "Get 1 more — $0.50" button would offer
 * the member something that simply fails. The UI reads this and shows a
 * "coming soon" note instead of a broken button.
 *
 * The moment NEXT_PUBLIC_STRIPE_PRICE_ANALYSIS_ADDON is set, the real button
 * appears with no code change — and the purchase route still independently
 * verifies the price is one-time, USD and exactly 50 cents before charging.
 */
export function analysisAddonAvailable(): boolean {
  return Boolean(ANALYSIS_ADDON.priceId);
}

/** Length of one allowance period, in days. Weekly by product decision. */
export const AI_ANALYSIS_PERIOD_DAYS = 7;

/**
 * Included weekly allowance for a tier.
 *
 * INCLUDED allowance only. Purchased add-ons are a separate, persistent
 * balance tracked in the `analysis_purchases` ledger and added on top at
 * reservation time — see lib/ai/quota.ts. They are deliberately NOT folded in
 * here, because included analyses reset weekly and purchased ones never do.
 */
export function weeklyAiAllowance(tier: Tier): number {
  return AI_ANALYSIS_LIMITS[tier] ?? 0;
}

export const FEATURE_LABEL: Record<Feature, string> = {
  dashboard: 'Dashboard',
  basic_resources: 'Training resources',
  basic_tracking: 'Performance tracking',
  monthly_content: 'Monthly coaching content',
  workout_plans: 'Workout plans',
  ai_shot_analysis: 'AI Shot Analysis',
  nutrition_plans: 'Nutrition & meal planning',
  mindset_training: 'Mindset development',
  video_review: 'Video review',
  weekly_checkins: 'Weekly check-ins',
  custom_workout_programming: 'Custom workout programming',
  custom_nutrition_coaching: 'Custom nutrition coaching',
  advanced_tracking: 'Advanced performance tracking',
  priority_support: 'Priority support',
};
