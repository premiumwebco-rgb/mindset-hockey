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
 * Standard Options — the Training/development-related features already
 * included with the $49/mo Membership (MEMBERSHIP_PERMISSIONS), shown on the
 * "Request Custom Plan" form's "Standard Options" column alongside the
 * Personalized Options below. Derived directly from MEMBERSHIP_PERMISSIONS +
 * PERMISSION_LABEL rather than a separate list, so there is exactly one
 * place that defines what these features are called — selecting one here
 * doesn't grant anything new (an active member already has all of these);
 * it's context for the coach reviewing the request, submitted through the
 * same requested_services array as CUSTOM_COACHING_SERVICES.
 */
export const STANDARD_MEMBERSHIP_FEATURES: { key: MembershipPermission; label: string }[] =
  MEMBERSHIP_PERMISSIONS.map((key) => ({ key, label: PERMISSION_LABEL[key] }));

/**
 * Custom Plan option catalog shown on the "Build Your Plan" form
 * (app/(app)/custom/page.tsx) and on the premium "1-on-1 Online Coaching"
 * page. `key` is the value stored in `custom_plan_requests.requested_services`
 * / `custom_plan_purchases.personalized_keys` — it is what a member actually
 * buys, resolved through `relatedPermission` to the permission column an
 * admin/the Stripe webhook grants.
 *
 * EXACTLY these four options exist — this is the full catalog, not a subset.
 * Trimmed from an earlier 8-entry catalog: '1-on-1 Online Coaching' is no
 * longer a separate purchasable line — it is now the name of the premium
 * experience these four options (chiefly Weekly Check-Ins) deliver, with its
 * own page. 'Direct Messaging Support' is no longer sold either — every
 * Custom Plan member already gets that access, communicated on-page rather
 * than sold as a line item (see the premium page's copy). 'Personalized
 * Development Plan' is gone because every member already receives one, and
 * 'Future In-Person Sessions' is gone as a purchasable option. The
 * 'direct_messaging'/'one_on_one_coaching'/'custom_programming' permission
 * columns behind those retired options still exist (COACHING_PERMISSIONS
 * below) for admin-side grants and for historical purchases made before this
 * catalog changed — trimming the catalog does not touch anyone's existing
 * entitlement.
 */
export const CUSTOM_COACHING_SERVICES: {
  key: string;
  label: string;
  description: string;
  relatedPermission: CoachingPermission;
}[] = [
  {
    key: 'weekly_checkins',
    label: 'Weekly Check-Ins',
    description:
      'Choose a day of the week that works best for you. We\'ll schedule a weekly phone call to review your progress, answer questions, provide mentorship, and make sure you\'re staying on track toward your goals.',
    relatedPermission: 'weekly_checkins',
  },
  {
    key: 'video_reviews',
    label: 'Video Reviews',
    description:
      'Submit videos of practices, games, shooting sessions, or workouts and receive detailed coaching feedback with actionable improvements.',
    relatedPermission: 'video_reviews',
  },
  {
    key: 'custom_workout_programming',
    label: 'Custom Workout Programming',
    description: 'Personalized gym and training programming built around this athlete\'s goals and schedule.',
    relatedPermission: 'custom_programming',
  },
  {
    key: 'custom_nutrition_coaching',
    label: 'Custom Nutrition Coaching',
    description: 'Personalized nutrition guidance and adjustments based on performance and goals.',
    relatedPermission: 'custom_programming',
  },
];
