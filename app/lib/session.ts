import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TIER_RANK, type Tier, type Role } from './types';
import { FEATURE_PERMISSION, OPEN_FEATURES, type Feature } from './plans';
import { PERMISSION_KEYS, emptyPermissions, type PermissionKey } from './permissions';

export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  tier: Tier;
  role: Role;
  /** True when a paid subscription is currently in good standing. */
  subscriptionActive: boolean;
  /**
   * The real access boundary. Auto-managed membership permissions are kept in
   * sync by the Stripe webhook; coaching permissions are set only by an admin
   * in Admin > Plan Management. Mirrored by `auth_has_permission()` in
   * Postgres, which is the actual enforcement point — this is convenience for
   * route guards and UI.
   */
  permissions: Record<PermissionKey, boolean>;
  demo: boolean;
}

/**
 * Current session.
 *
 * DEMO MODE (no Supabase env): reads `mh_tier` / `mh_role` cookies so every
 * screen can be previewed at any tier without a backend. Never use in prod —
 * `DEMO_MODE` is false the moment NEXT_PUBLIC_SUPABASE_URL is set.
 *
 * PRODUCTION: reads the Supabase session, then the `profiles` row. Tier gating
 * is ALSO enforced by RLS in Postgres, so this is defence in depth rather than
 * the only lock. A forged cookie cannot read premium rows.
 */
export async function getSession(): Promise<Session | null> {
  if (DEMO_MODE) {
    const store = await cookies();
    const tier = (store.get('mh_tier')?.value as Tier) ?? 'membership';
    const role = (store.get('mh_role')?.value as Role) ?? 'member';
    const active = tier !== 'none';
    return {
      userId: 'demo-user',
      email: 'demo@mindsethockey.com',
      fullName: 'Demo Member',
      tier: TIER_RANK[tier] === undefined ? 'membership' : tier,
      role,
      subscriptionActive: active,
      // Demo mode gives a full-access preview at any non-'none' tier so every
      // screen can be walked through with no backend connected.
      permissions: Object.fromEntries(
        PERMISSION_KEYS.map((k) => [k, active])
      ) as Record<PermissionKey, boolean>,
      demo: true,
    };
  }

  const { createServerClient } = await import('./supabase/server');
  const supabase = await createServerClient();

  // getUser() revalidates the JWT with Supabase — do not trust getSession()
  // alone on the server, it only decodes the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      `email, full_name, tier, role, subscription_active, ${PERMISSION_KEYS.join(', ')}`
    )
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const row = profile as unknown as Record<string, unknown>;
  const permissions = emptyPermissions();
  for (const key of PERMISSION_KEYS) {
    permissions[key] = Boolean(row[key]);
  }

  return {
    userId: user.id,
    email: row.email as string,
    fullName: (row.full_name as string | null) ?? '',
    tier: (row.tier as Tier) ?? 'none',
    role: (row.role as Role) ?? 'member',
    subscriptionActive: Boolean(row.subscription_active),
    permissions,
    demo: false,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** Admins bypass tier checks entirely; coaches bypass member-content checks. */
function isStaff(role: Role): boolean {
  return role === 'admin' || role === 'coach';
}

export function hasTier(session: Session, required: Tier): boolean {
  if (session.role === 'admin') return true;
  if (TIER_RANK[session.tier] < TIER_RANK[required]) return false;
  // A lapsed subscription keeps the tier label but loses access.
  if (required !== 'none' && !session.subscriptionActive) return false;
  return true;
}

/**
 * THE REAL ACCESS CHECK. `feature` is resolved to a PermissionKey via
 * `FEATURE_PERMISSION` (lib/plans.ts) and checked against the member's actual
 * permission columns — tier is no longer consulted here at all, except that
 * an admin always passes and a feature with no specific permission (an
 * `OPEN_FEATURE`, or one with no mapping — meaning "any active membership")
 * falls back to `subscriptionActive`.
 */
export function canUse(session: Session, feature: Feature): boolean {
  if (session.role === 'admin') return true;
  if (OPEN_FEATURES.has(feature)) return true;
  const perm = FEATURE_PERMISSION[feature];
  if (perm) return hasPermission(session, perm);
  return session.subscriptionActive;
}

/** The direct permission check — prefer this over canUse()/Feature at new call sites. */
export function hasPermission(session: Session, perm: PermissionKey): boolean {
  if (session.role === 'admin') return true;
  return Boolean(session.permissions[perm]);
}

/** Route guard: redirects to the upgrade page when under-tiered. Legacy — prefer requirePermission. */
export async function requireTier(min: Tier): Promise<Session> {
  const session = await requireSession();
  if (!hasTier(session, min)) redirect(`/upgrade?need=${min}`);
  return session;
}

/** Route guard for a named feature — preferred over requireTier at call sites. */
export async function requireFeature(feature: Feature): Promise<Session> {
  const session = await requireSession();
  if (!canUse(session, feature)) redirect(`/upgrade?f=${feature}`);
  return session;
}

/** Route guard for a specific permission — the preferred guard for new/updated pages. */
export async function requirePermission(perm: PermissionKey): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session, perm)) redirect(`/upgrade?p=${perm}`);
  return session;
}

export async function requireStaff(): Promise<Session> {
  const session = await requireSession();
  if (!isStaff(session.role)) redirect('/dashboard');
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== 'admin') redirect('/dashboard');
  return session;
}
