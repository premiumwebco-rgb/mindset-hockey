import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions';
import { Eyebrow } from '@/components/ui';
import PlanManagementManager, {
  type AdminPlanUser,
  type AdminPlanRequest,
} from './PlanManagementManager';

export const metadata = { title: 'Plan Management — Mindset Hockey' };
export const dynamic = 'force-dynamic';

async function loadData(): Promise<{ users: AdminPlanUser[]; requests: AdminPlanRequest[] }> {
  if (DEMO_MODE) return { users: [], requests: [] };

  const admin = await createAdminClient();

  const { data: profileRows } = await admin
    .from('profiles')
    .select(`id, email, full_name, tier, subscription_active, ${PERMISSION_KEYS.join(', ')}`)
    .order('created_at', { ascending: false });

  const users: AdminPlanUser[] = (profileRows ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const permissions = Object.fromEntries(
      PERMISSION_KEYS.map((k) => [k, Boolean(r[k])])
    ) as Record<PermissionKey, boolean>;
    return {
      id: r.id as string,
      email: r.email as string,
      fullName: (r.full_name as string | null) ?? null,
      tier: r.tier as string,
      subscriptionActive: Boolean(r.subscription_active),
      permissions,
    };
  });

  const { data: requestRows } = await admin
    .from('custom_plan_requests')
    .select('id, profile_id, requested_services, notes, status, created_at, profiles(email, full_name)')
    .order('created_at', { ascending: false });

  const requests: AdminPlanRequest[] = (requestRows ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const profile = r.profiles as { email?: string; full_name?: string | null } | null;
    return {
      id: r.id as string,
      profileId: r.profile_id as string,
      email: profile?.email ?? '—',
      fullName: profile?.full_name ?? null,
      requestedServices: (r.requested_services as string[] | null) ?? [],
      notes: (r.notes as string | null) ?? null,
      status: r.status as AdminPlanRequest['status'],
      createdAt: r.created_at as string,
    };
  });

  return { users, requests };
}

export default async function AdminPlanManagementPage() {
  await requireAdmin();
  const { users, requests } = await loadData();

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Plan Management</h1>
      <p className="mt-3 max-w-[70ch] text-[16px] text-silver">
        Custom Coaching runs entirely on permissions, not extra membership tiers. Review requests
        below, then enable exactly the access categories each athlete&apos;s package includes.
        Changes save instantly.
      </p>

      <PlanManagementManager users={users} requests={requests} demo={DEMO_MODE} />
    </div>
  );
}
