import Link from 'next/link';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { PLAN_BY_SLUG } from '@/lib/plans';
import { Card, Eyebrow, Stat } from '@/components/ui';

export const metadata = { title: 'Admin — Mindset Hockey' };

interface Counts {
  members: number;
  membership: number;
  customCoaching: number;
  activeSubs: number;
  analyses: number;
  pendingReviews: number;
  openLeads: number;
  planRequests: number;
  mrr: number;
}

async function loadCounts(): Promise<Counts> {
  if (DEMO_MODE) {
    return {
      members: 24,
      membership: 21,
      customCoaching: 4,
      activeSubs: 21,
      analyses: 68,
      pendingReviews: 3,
      openLeads: 5,
      planRequests: 2,
      mrr: 1029,
    };
  }
  const admin = await createAdminClient();
  const q = (t: string) => admin.from(t).select('*', { count: 'exact', head: true });

  const [members, membership, activeSubs, coaching, analyses, pending, leads, planRequests] =
    await Promise.all([
      q('profiles'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'membership'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_active', true),
      // Custom Coaching = anyone with at least one coaching-only permission on,
      // whether or not they're also a paying Membership subscriber.
      admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or(
          'one_on_one_coaching.eq.true,weekly_checkins.eq.true,video_reviews.eq.true,direct_messaging.eq.true,custom_programming.eq.true'
        ),
      q('shot_analyses'),
      admin.from('video_submissions').select('*', { count: 'exact', head: true }).in('status', ['queued', 'in_review']),
      admin.from('leads').select('*', { count: 'exact', head: true }).eq('handled', false),
      admin.from('custom_plan_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    ]);

  const membershipCount = membership.count ?? 0;

  return {
    members: members.count ?? 0,
    membership: membershipCount,
    customCoaching: coaching.count ?? 0,
    activeSubs: activeSubs.count ?? 0,
    analyses: analyses.count ?? 0,
    pendingReviews: pending.count ?? 0,
    openLeads: leads.count ?? 0,
    planRequests: planRequests.count ?? 0,
    mrr: membershipCount * PLAN_BY_SLUG.membership.monthly,
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const c = await loadCounts();

  const links = [
    { href: '/admin/users', title: 'Users', body: 'Roles, tiers, access and suspensions.' },
    { href: '/admin/plans', title: 'Plan Management', body: `${c.planRequests} new Custom Coaching request${c.planRequests === 1 ? '' : 's'}.` },
    { href: '/admin/subscriptions', title: 'Subscriptions', body: 'Billing status and lifecycle history.' },
    { href: '/coach/queue', title: 'Review queue', body: `${c.pendingReviews} submission${c.pendingReviews === 1 ? '' : 's'} waiting.` },
    { href: '/admin/content', title: 'Content', body: 'Workouts, meal plans and mindset lessons.' },
    { href: '/admin/workouts', title: 'Workout Content', body: 'Create and manage your own workout routines.' },
    { href: '/admin/mindset', title: 'Mindset Training', body: 'Video lessons across confidence, focus, pressure and more.' },
    { href: '/admin/ai-coaching', title: 'AI Coaching', body: 'Drill recommendation mappings for AI Shot Analysis weaknesses.' },
    { href: '/admin/leads', title: 'Leads', body: `${c.openLeads} unhandled enquir${c.openLeads === 1 ? 'y' : 'ies'}.` },
  ];

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Business overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Estimated MRR" value={`$${c.mrr.toLocaleString()}`} sub={`${c.membership} × $${PLAN_BY_SLUG.membership.monthly} Membership`} />
        <Stat label="Active members" value={String(c.activeSubs)} sub={`${c.members} accounts total`} />
        <Stat label="Custom Coaching" value={String(c.customCoaching)} sub="Any coaching permission on" />
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
        MRR is calculated from current Membership tier assignments, not from Stripe invoices.
        Stripe remains the source of truth for revenue — reconcile there before reporting numbers.
      </p>
    </div>
  );
}
