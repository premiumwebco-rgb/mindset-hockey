import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, Eyebrow, TierPill } from '@/components/ui';
import UserRow from '@/components/admin/UserRow';

export const metadata = { title: 'Users — Admin' };

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tier: string;
  subscription_active: boolean;
  suspended: boolean;
  created_at: string;
}

export default async function AdminUsersPage() {
  await requireAdmin();

  let users: AdminUser[] = [];
  if (DEMO_MODE) {
    users = [
      { id: '1', email: 'parent1@example.com', full_name: 'Sarah Doyle', role: 'member', tier: 'premium', subscription_active: true, suspended: false, created_at: new Date().toISOString() },
      { id: '2', email: 'parent2@example.com', full_name: 'Mike Chen', role: 'member', tier: 'basic', subscription_active: true, suspended: false, created_at: new Date().toISOString() },
      { id: '3', email: 'parent3@example.com', full_name: 'Dana Reid', role: 'member', tier: 'premium', subscription_active: false, suspended: false, created_at: new Date().toISOString() },
    ];
  } else {
    const admin = await createAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('id, email, full_name, role, tier, subscription_active, suspended, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    users = (data as AdminUser[]) ?? [];
  }

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Users</h1>
      <p className="mt-3 text-[15px] text-silver-dim">{users.length} accounts</p>

      <Card className="mt-7 overflow-hidden p-0">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-white/[.08] bg-navy-700/40">
            <tr className="text-[10px] uppercase tracking-[.14em] text-silver-dim">
              <th className="px-4 py-3 font-bold">Member</th>
              <th className="px-4 py-3 font-bold">Tier</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} demo={DEMO_MODE} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
