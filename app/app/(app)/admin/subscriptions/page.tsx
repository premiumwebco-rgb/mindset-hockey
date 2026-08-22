import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Subscriptions — Admin' };

interface SubRow {
  id: string;
  tier: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  setup_fee_paid: boolean;
  stripe_subscription_id: string | null;
  profiles: { email: string; full_name: string | null } | null;
}

const STATUS_STYLE: Record<string, string> = {
  active: 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]',
  trialing: 'border-electric/40 bg-electric/10 text-electric-glow',
  past_due: 'border-amber/40 bg-amber/10 text-amber',
  unpaid: 'border-rink-red/50 bg-rink-red/10 text-[#ff6b85]',
  canceled: 'border-white/20 text-silver-dim',
  incomplete: 'border-white/20 text-silver-dim',
};

export default async function AdminSubscriptionsPage() {
  await requireAdmin();

  let subs: SubRow[] = [];
  if (DEMO_MODE) {
    subs = [
      { id: '1', tier: 'premium', status: 'active', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), cancel_at_period_end: false, setup_fee_paid: true, stripe_subscription_id: 'sub_demo1', profiles: { email: 'parent1@example.com', full_name: 'Sarah Doyle' } },
      { id: '2', tier: 'basic', status: 'past_due', current_period_end: new Date(Date.now() - 2 * 864e5).toISOString(), cancel_at_period_end: false, setup_fee_paid: true, stripe_subscription_id: 'sub_demo2', profiles: { email: 'parent2@example.com', full_name: 'Mike Chen' } },
    ];
  } else {
    const admin = await createAdminClient();
    const { data } = await admin
      .from('subscriptions')
      .select('id, tier, status, current_period_end, cancel_at_period_end, setup_fee_paid, stripe_subscription_id, profiles(email, full_name)')
      .order('updated_at', { ascending: false })
      .limit(200);
    subs = (data as unknown as SubRow[]) ?? [];
  }

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Subscriptions</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-silver-dim">
        Mirrored from Stripe by the webhook. Stripe stays authoritative — refund, pause and
        cancel there, and this table follows within seconds.
      </p>

      {subs.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No subscriptions yet" body="They appear here as soon as the first checkout completes." />
        </div>
      ) : (
        <>
          {/* Desktop/tablet: real table. Below md, a fixed 5-column table
              either overflows or crushes text unreadably — so under md this
              is replaced entirely by stacked cards (below), not scrolled. */}
          <Card className="mt-7 hidden overflow-hidden p-0 md:block">
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-white/[.08] bg-navy-700/40">
                <tr className="text-[10px] uppercase tracking-[.14em] text-silver-dim">
                  <th className="px-4 py-3 font-bold">Member</th>
                  <th className="px-4 py-3 font-bold">Plan</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Renews</th>
                  <th className="px-4 py-3 font-bold">Setup fee</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-white/[.05] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{s.profiles?.full_name || '—'}</p>
                      <p className="text-[12.5px] text-silver-dim">{s.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-silver">{s.tier}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${STATUS_STYLE[s.status] ?? 'border-white/20 text-silver-dim'}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                      {s.cancel_at_period_end && (
                        <span className="ml-2 text-[11px] text-amber">cancels at period end</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-silver-dim">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-silver-dim">{s.setup_fee_paid ? 'Paid' : 'Unpaid'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: one stacked card per subscription — same data, no
              horizontal scrolling or crushed columns. */}
          <div className="mt-7 grid gap-3 md:hidden">
            {subs.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{s.profiles?.full_name || '—'}</p>
                    <p className="truncate text-[12.5px] text-silver-dim">{s.profiles?.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${STATUS_STYLE[s.status] ?? 'border-white/20 text-silver-dim'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[.12em] text-silver-dim">Plan</dt>
                    <dd className="capitalize text-silver">{s.tier}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[.12em] text-silver-dim">Setup fee</dt>
                    <dd className="text-silver">{s.setup_fee_paid ? 'Paid' : 'Unpaid'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10.5px] uppercase tracking-[.12em] text-silver-dim">Renews</dt>
                    <dd className="text-silver">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {s.cancel_at_period_end && <span className="ml-2 text-amber">cancels at period end</span>}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
