/* ==========================================================================
   PERMISSION-BASED ACCESS CONTROL

   Replaces the old Basic/Premium tier gate. Each profile carries 11
   independent boolean grants (see migration `permission_columns_and_helper`
   and `auth_has_permission()` in Postgres, which is the REAL boundary — this
   file is the TypeScript mirror used for UI/route-guard convenience).

   Two groups:
     MEMBERSHIP permissions — included automatically with the $49/mo
       Mindset Hockey Membership plan. Kept in sync by the Stripe webhook
       (applyEntitlement in app/api/stripe/webhook/route.ts) — never hand-edit
       these for a paying member outside Admin > Plan Management, or the next
       webhook event will overwrite the change.
     COACHING permissions — never granted by Stripe. Only ever set by an
       admin, from Admin > Plan Management, after reviewing a submission from
       the "Request Custom Plan" form.
   ========================================================================== */

export const MEMBERSHIP_PERMISSIONS = [
  'ai_shot_analysis',
  'workouts',
  'nutrition',
  'mindset',
  'video_library',
  'progress_tracking',
] as const;

export const COACHING_PERMISSIONS = [
  'video_reviews',
  'weekly_checkins',
  'direct_messaging',
  'one_on_one_coaching',
  'custom_programming',
] as const;

export const PERMISSION_KEYS = [...MEMBERSHIP_PERMISSIONS, ...COACHING_PERMISSIONS] as const;

export type MembershipPermission = (typeof MEMBERSHIP_PERMISSIONS)[number];
export type CoachingPermission = (typeof COACHING_PERMISSIONS)[number];
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === 'string' && (PERMISSION_KEYS as readonly string[]).includes(value);
}

export const PERMISSION_LABEL: Record<PermissionKey, string> = {
  ai_shot_analysis: 'AI Shot Analysis',
  workouts: 'Workout Plans',
  nutrition: 'Nutrition & Meal Plans',
  mindset: 'Mindset Training',
  video_library: 'Training Video Library',
  progress_tracking: 'Progress Tracking',
  video_reviews: 'Video Reviews',
  weekly_checkins: 'Weekly Check-ins',
  direct_messaging: 'Direct Messaging Support',
  one_on_one_coaching: '1-on-1 Online Coaching',
  custom_programming: 'Custom Programming',
};

/** Every permission off — the shape a brand-new/free profile starts from. */
export function emptyPermissions(): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<
    PermissionKey,
    boolean
  >;
}

/**
 * Whether a given `tier` value should be treated as "on the Membership plan"
 * for entitlement purposes. Legacy 'basic'/'premium' rows (the retired public
 * tiers, still billed at their original legacy Stripe price — see the Stripe
 * webhook's tierFromMetadata()) count as Membership here, exactly like they
 * do everywhere else entitlement is decided.
 */
export function tierGrantsMembership(tier: string | null | undefined): boolean {
  return tier === 'membership' || tier === 'basic' || tier === 'premium';
}

/**
 * The exact permission cascade applied whenever a member's Membership
 * entitlement is granted or revoked — shared by the Stripe webhook's
 * applyEntitlement() (app/api/stripe/webhook/route.ts) and by the Admin >
 * Users manual activate/deactivate control (app/api/admin/user/route.ts), so
 * a staff member flipping the Active/Inactive toggle produces the identical
 * permission state a real Stripe event would have produced — never a member
 * who shows ACTIVE everywhere but is locked out of every gated page.
 *
 * COACHING_PERMISSIONS are never included here. Those are always admin-only,
 * granted individually from Admin > Plan Management after reviewing a Custom
 * Coaching request — independent of Membership status, whether that status
 * changed via Stripe or via a manual admin action.
 */
export function membershipPermissionPatch(
  tier: string | null | undefined,
  active: boolean
): Record<MembershipPermission, boolean> {
  const grant = tierGrantsMembership(tier) && active;
  return Object.fromEntries(MEMBERSHIP_PERMISSIONS.map((k) => [k, grant])) as Record<
    MembershipPermission,
    boolean
  >;
}

/**
 * Custom-coaching service catalog shown on the "Request Custom Plan" form.
 * `key` is the value stored in `custom_plan_requests.requested_services` —
 * it is a request, not a grant, so several service keys intentionally map
 * onto the same underlying permission column; an admin decides what to
 * actually enable for the member in Admin > Plan Management after reviewing
 * the request.
 */
export const CUSTOM_COACHING_SERVICES: {
  key: string;
  label: string;
  description: string;
  relatedPermission: CoachingPermission;
}[] = [
  {
    key: 'one_on_one_coaching',
    label: '1-on-1 Online Coaching',
    description: 'Direct coaching sessions run remotely.',
    relatedPermission: 'one_on_one_coaching',
  },
  {
    key: 'weekly_checkins',
    label: 'Weekly Check-ins',
    description: 'A recurring check-in on progress, goals and adjustments.',
    relatedPermission: 'weekly_checkins',
  },
  {
    key: 'video_reviews',
    label: 'Video Reviews',
    description: 'Coach-reviewed film breakdowns beyond the AI analysis.',
    relatedPermission: 'video_reviews',
  },
  {
    key: 'direct_messaging',
    label: 'Direct Messaging Support',
    description: 'Ongoing message access to a coach between sessions.',
    relatedPermission: 'direct_messaging',
  },
  {
    key: 'custom_workout_programming',
    label: 'Custom Workout Programming',
    description: 'Programming built specifically around this athlete, not the shared library.',
    relatedPermission: 'custom_programming',
  },
  {
    key: 'custom_nutrition_coaching',
    label: 'Custom Nutrition Coaching',
    description: 'A nutrition plan built around this athlete rather than the shared cookbook.',
    relatedPermission: 'custom_programming',
  },
  {
    key: 'personalized_development_plan',
    label: 'Personalized Development Plan',
    description: 'A long-term roadmap tailored to this athlete’s goals.',
    relatedPermission: 'custom_programming',
  },
  {
    key: 'in_person_sessions',
    label: 'Future In-Person Sessions',
    description: 'On-ice or in-person sessions when that becomes available again in your area.',
    relatedPermission: 'custom_programming',
  },
];
