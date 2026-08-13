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

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  tier: Tier;
  slug: 'standard' | 'premium';
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
      { label: 'AI Shot Analysis', included: true },
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
      { label: 'Everything in Standard, including AI Shot Analysis', included: true },
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
  // Included with BOTH Standard and Premium. Mirrored by the RLS policies on
  // shot_analyses and storage.objects in migration 0004.
  ai_shot_analysis: 'basic',
  nutrition_plans: 'premium',
  mindset_training: 'premium',
  video_review: 'premium',
  advanced_tracking: 'premium',
  priority_support: 'premium',
};

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
