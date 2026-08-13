import Link from 'next/link';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, Eyebrow, Stat } from '@/components/ui';

export const metadata = { title: 'Admin — Mindset Hockey' };

interface Counts {
  members: number;
  premium: number;
  basic: number;
  activeSubs: number;
  analyses: number;
  pendingReviews: number;
  openLeads: number;
  mrr: number;
}

async function loadCounts(): Promise<Counts> {
  if (DEMO_MODE) {
    return { members: 24, premium: 11, basic: 13, activeSubs: 21, analyses: 68, pendingReviews: 3, openLeads: 5, mrr: 5350 };
  }
  const admin = await createAdminClient();
  const q = (t: string) => admin.from(t).select('*', { count: 'exact', head: true });

  const [members, premium, basic, activeSubs, analyses, pending, leads] = await Promise.all([
    q('profiles'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'premium'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'basic'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_active', true),
    q('shot_analyses'),
    admin.from('video_submissions').select('*', { count: 'exact', head: true }).in('status', ['queued', 'in_review']),
    admin.from('leads').select('*', { count: 'exact', head: true }).eq('handled', false),
  ]);

  const premiumCount = premium.count ?? 0;
  const basicCount = basic.count ?? 0;

  return {
    members: members.count ?? 0,
    premium: premiumCount,
    basic: basicCount,
    activeSubs: activeSubs.count ?? 0,
    analyses: analyses.count ?? 0,
    pendingReviews: pending.count ?? 0,
    openLeads: leads.count ?? 0,
    mrr: premiumCount * 250 + basicCount * 200,
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const c = await loadCounts();

  const links = [
    { href: '/admin/users', title: 'Users', body: 'Roles, tiers, access and suspensions.' },
    { href: '/admin/subscriptions', title: 'Subscriptions', body: 'Billing status and lifecycle history.' },
    { href: '/coach/queue', title: 'Review queue', body: `${c.pendingReviews} submission${c.pendingReviews === 1 ? '' : 's'} waiting.` },
    { href: '/admin/content', title: 'Content', body: 'Workouts, meal plans and mindset lessons.' },
    { href: '/admin/leads', title: 'Leads', body: `${c.openLeads} unhandled enquir${c.openLeads === 1 ? 'y' : 'ies'}.` },
  ];

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Business overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Estimated MRR" value={`$${c.mrr.toLocaleString()}`} sub="Active plans × price" />
        <Stat label="Active members" value={String(c.activeSubs)} sub={`${c.members} accounts total`} />
        <Stat label="Premium / Basic" value={`${c.premium} / ${c.basic}`} sub="By tier" />
        <Stat label="Analyses run" value={String(c.analyses)} sub="All time" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card hover className="h-full p-6">
              <h3 className="display text-[19px]">{l.title}</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">{l.body}</p>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-[13px] text-silver-dim">
        MRR is calculated from current tier assignments, not from Stripe invoices. Stripe remains
        the source of truth for revenue — reconcile there before reporting numbers.
      </p>
    </div>
  );
}
