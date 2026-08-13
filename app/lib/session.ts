import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TIER_RANK, type Tier, type Role } from './types';
import { FEATURE_MIN_TIER, type Feature } from './plans';

export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  tier: Tier;
  role: Role;
  /** True when a paid subscription is currently in good standing. */
  subscriptionActive: boolean;
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
    const tier = (store.get('mh_tier')?.value as Tier) ?? 'premium';
    const role = (store.get('mh_role')?.value as Role) ?? 'member';
    return {
      userId: 'demo-user',
      email: 'demo@mindsethockey.com',
      fullName: 'Demo Member',
      tier: TIER_RANK[tier] === undefined ? 'premium' : tier,
      role,
      subscriptionActive: tier !== 'none',
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
    .select('email, full_name, tier, role, subscription_active')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name ?? '',
    tier: (profile.tier as Tier) ?? 'none',
    role: (profile.role as Role) ?? 'member',
    subscriptionActive: Boolean(profile.subscription_active),
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

export function canUse(session: Session, feature: Feature): boolean {
  return hasTier(session, FEATURE_MIN_TIER[feature]);
}

/** Route guard: redirects to the upgrade page when under-tiered. */
export async function requireTier(min: Tier): Promise<Session> {
  const session = await requireSession();
  if (!hasTier(session, min)) redirect(`/upgrade?need=${min}`);
  return session;
}

/** Route guard for a named feature — preferred over requireTier at call sites. */
export async function requireFeature(feature: Feature): Promise<Session> {
  const session = await requireSession();
  if (!canUse(session, feature)) redirect(`/upgrade?need=${FEATURE_MIN_TIER[feature]}&f=${feature}`);
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
