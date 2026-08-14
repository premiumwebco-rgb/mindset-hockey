import type { Tier } from './types';

/* ==========================================================================
   Plans — must stay in lockstep with the public pricing page.

   Standard  $249 setup + $100/month
   Premium   $389 setup + $149/month   ⭐ Most Popular
   Custom    quote only (lead form, no self-serve checkout)

   NOTE ON AI SHOT ANALYSIS
   AI Shot Analysis is included with BOTH tiers — Standard and Premium. It is a
   real feature in this app (see lib/ai/ and app/(app)/analysis/), gated at
   `basic` in FEATURE_MIN_TIER below, which `auth_has_tier('basic')` reads as
   "basic OR premium, with an active subscription". Do not move it to premium.
   ========================================================================== */

/* --------------------------------------------------------------------------
   PLAN VOCABULARY — one canonical form, converted explicitly at the edges.

   CANONICAL (internal):  Tier — 'none' | 'basic' | 'premium'
     This is what the database enum `tier_t`, `profiles.tier`, the RLS function
     `auth_has_tier()` and `session.tier` all speak. Application code should
     only ever compare tiers.

   PUBLIC (URLs + API bodies):  PlanSlug — 'standard' | 'premium'
     This is what a member sees. 'basic' is the historical internal name for
     the Standard plan and must never appear in a URL.

   The two vocabularies meet in exactly ONE place: `planFromParam()`. Every
   route boundary that receives a plan from outside (a query string, a JSON
   body) must go through it. Nothing else may translate between them — that is
   what stops `basic` and `standard` being mixed up silently.
-------------------------------------------------------------------------- */
export type PlanSlug = 'standard' | 'premium';

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
  /** One-time onboarding fee, in dollars. */
  setupFee: number;
  /** Recurring monthly fee, in dollars. */
  monthly: number;
  featured?: boolean;
  cta: string;
  /** Stripe Price ID for the recurring subscription line. */
  priceIdMonthly?: string;
  /** Stripe Price ID for the one-time setup line. MUST be a one-time price. */
  priceIdSetup?: string;
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    tier: 'basic',
    slug: 'standard',
    name: 'Standard Development Program',
    tagline: 'Build the foundation for long-term hockey development.',
    who: 'For players who need structure, a real plan and someone holding them to it.',
    setupFee: 249,
    monthly: 100,
    cta: 'Get Started',
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY,
    priceIdSetup: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP,
    features: [
      { label: '10 AI Shot Analyses per week', included: true },
      { label: 'Personalized hockey development roadmap', included: true },
      { label: 'Hockey-specific workout plan', included: true },
      { label: 'Monthly progress review', included: true },
      { label: 'Goal setting and accountability', included: true },
      { label: 'Basic performance tracking', included: true },
      { label: 'Coaching support', included: true },
      { label: 'Member dashboard access', included: true },
      { label: 'Nutrition and meal planning', included: false },
      { label: 'Video analysis and breakdowns', included: false },
      { label: 'Mindset development training', included: false },
      { label: 'Advanced performance tracking', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    tier: 'premium',
    slug: 'premium',
    name: 'Premium Development Program',
    tagline: 'Everything serious athletes need to reach the next level.',
    who: 'The complete system — skills, strength, nutrition, film and the mental side.',
    setupFee: 389,
    monthly: 149,
    featured: true,
    cta: 'Get Started',
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY,
    priceIdSetup: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP,
    features: [
      { label: '20 AI Shot Analyses per week', included: true },
      { label: 'Everything in Standard', included: true },
      { label: 'Customized training program that evolves as the athlete progresses', included: true },
      { label: "Performance nutrition guidance tailored to the athlete's goals", included: true },
      { label: 'Video analysis and breakdowns', included: true },
      { label: 'Advanced performance tracking', included: true },
      { label: 'Mindset development training', included: true },
      { label: 'Priority support', included: true },
      { label: 'Personalized coaching guidance', included: true },
      { label: 'Monthly coaching review sessions', included: true },
      { label: 'Premium resource library', included: true },
    ],
  },
];

export const PLAN_BY_SLUG: Record<string, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.slug, p])
);

export function planForTier(tier: Tier): Plan | undefined {
  return PLANS.find((p) => p.tier === tier);
}

/**
 * THE ONLY BRIDGE BETWEEN THE PUBLIC AND CANONICAL VOCABULARIES.
 *
 * Accepts whatever arrived from outside — a `?plan=` query string, a JSON body
 * — and resolves it to a Plan, or `undefined` if it is not a real plan.
 *
 * It deliberately accepts the internal tier name as a legacy alias so that old
 * links and bookmarks (`/signup?plan=basic`) keep working, but it normalises
 * immediately: callers get a Plan and should thereafter use `plan.slug` for
 * anything outward-facing and `plan.tier` for anything internal. `'none'` is
 * not a purchasable plan and is rejected.
 */
export function planFromParam(param: string | null | undefined): Plan | undefined {
  if (!param) return undefined;
  const key = param.trim().toLowerCase();
  return PLANS.find((p) => p.slug === key || p.tier === key);
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
   Feature gate map. One place that decides what each tier can reach, so the
   UI, the route guards and the tests cannot drift apart.

   This map must stay in lockstep with the RLS policies in the migrations —
   these guards are convenience and UX, the database is the real boundary.
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
  | 'advanced_tracking'
  | 'priority_support';

export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  dashboard: 'basic',
  basic_resources: 'basic',
  basic_tracking: 'basic',
  monthly_content: 'basic',
  workout_plans: 'basic',
  // Reachable by EVERY signed-in account, including free ones — a new member
  // gets 3 free analyses and must be able to use them. This is a UX gate only:
  // the real boundary is the entitlement reservation in lib/ai/quota.ts plus
  // the RLS policies in 0007, which require either an active tier OR an
  // unspent credit. A free member with 0 credits still reaches the page and is
  // shown the upgrade options rather than being bounced to /upgrade.
  ai_shot_analysis: 'none',
  nutrition_plans: 'premium',
  mindset_training: 'premium',
  video_review: 'premium',
  advanced_tracking: 'premium',
  priority_support: 'premium',
};

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
  basic: 10, // Standard
  premium: 20, // Premium
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
  advanced_tracking: 'Advanced performance tracking',
  priority_support: 'Priority support',
};
