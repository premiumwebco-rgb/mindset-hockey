import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { Card, Eyebrow } from '@/components/ui';
import { mapSessionRow, mapRegistrationRow, ONE_ON_ONE_SESSION_PRICE_CENTS } from '@/lib/groupCoaching';
import { centsToDisplay } from '@/lib/customPlan';
import OneOnOneRequestForm from './OneOnOneRequestForm';
import GroupSessionList from './GroupSessionList';

export const metadata = { title: 'Sign Up — Live Virtual Coaching — Mindset Hockey' };
export const dynamic = 'force-dynamic';

/* ==========================================================================
   /coaching/signup — the destination of the "Sign Up" button on the Live
   Virtual Coaching page. Two independent paths, matching the two products
   described there:

     Option A — 1-on-1 Video Coaching ($30/session). No Stripe checkout: the
     coach and player have to coordinate an actual time, so this collects an
     availability/request instead of pretending a calendar exists. Writes to
     one_on_one_requests via OneOnOneRequestForm -> /api/coaching/one-on-one-request.

     Option B — Group Coaching Sessions ($10/session). Real Stripe checkout,
     one-time payment (mode: 'payment'), same shape as the AI Shot Analysis
     add-on. Lists every upcoming scheduled session (admin-created — see
     Admin > Group Sessions) with live spots-left, and the member's own
     registrations/cancellation state.
   ========================================================================== */

export default async function CoachingSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  let sessions: ReturnType<typeof mapSessionRow>[] = [];
  let registeredSessionIds = new Set<string>();
  const spotsTakenBySession = new Map<string, number>();
  let priorRequestCount = 0;

  if (!DEMO_MODE) {
    const supabase = await createServerClient();

    const [{ data: sessionRows }, { data: myRegistrations }, { data: allRegistrations }, { data: myRequests }] =
      await Promise.all([
        supabase
          .from('group_coaching_sessions')
          .select('*')
          .gte('start_at', new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString())
          .order('start_at', { ascending: true }),
        supabase
          .from('group_session_registrations')
          .select('session_id, status')
          .eq('profile_id', session.userId),
        supabase.from('group_session_registrations').select('session_id, status'),
        supabase.from('one_on_one_requests').select('id').eq('profile_id', session.userId),
      ]);

    sessions = (sessionRows ?? []).map(mapSessionRow);
    const myRegistrationRows = (myRegistrations ?? []).map(mapRegistrationRow);
    const allRegistrationRows = (allRegistrations ?? []).map(mapRegistrationRow);
    registeredSessionIds = new Set(
      myRegistrationRows.filter((r) => r.status === 'paid').map((r) => r.sessionId)
    );
    for (const row of allRegistrationRows) {
      if (row.status !== 'paid') continue;
      spotsTakenBySession.set(row.sessionId, (spotsTakenBySession.get(row.sessionId) ?? 0) + 1);
    }
    priorRequestCount = myRequests?.length ?? 0;
  }

  return (
    <div className="-mx-5 -my-8 rounded-[24px] bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(240,198,116,0.10),transparent),linear-gradient(180deg,#05070d_0%,#0a0e1a_55%,#05070d_100%)] px-5 py-12 sm:-mx-10 sm:px-10 lg:-my-10">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>Live Virtual Coaching</Eyebrow>
        <h1 className="display text-[clamp(28px,5vw,44px)] text-white">Sign Up</h1>
        <p className="mx-auto mt-3 max-w-[58ch] text-[15.5px] text-white/60">
          Choose 1-on-1 Video Coaching or a Group Coaching Session below.
        </p>
      </div>

      {sp.checkout === 'success' && (
        <Card className="mx-auto mt-6 max-w-[720px] border-[#3ddc84]/40 bg-[#3ddc84]/[.08] p-4 text-center text-[14.5px] text-white/80">
          Payment received — you&apos;re registered! Details are below.
        </Card>
      )}
      {sp.checkout === 'cancelled' && (
        <Card className="mx-auto mt-6 max-w-[720px] border-amber/40 bg-amber/[.06] p-4 text-center text-[14.5px] text-white/80">
          Checkout was cancelled — nothing has been charged.
        </Card>
      )}

      <div className="mx-auto mt-10 grid max-w-[960px] gap-6 lg:grid-cols-2 lg:items-start">
        <div className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-7 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="display text-[20px] text-white">Option A — 1-on-1 Video Coaching</h2>
            <span className="shrink-0 rounded-full border border-[#f0c674]/40 bg-[#f0c674]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#f0c674]">
              {centsToDisplay(ONE_ON_ONE_SESSION_PRICE_CENTS)}/session
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60">
            Because the coach and player need to coordinate the actual time, submit your
            availability below — a coach will follow up to establish the session time and take
            payment directly.
          </p>
          <div className="mt-6">
            <OneOnOneRequestForm hasPriorRequest={priorRequestCount > 0} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-7 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="display text-[20px] text-white">Option B — Group Coaching</h2>
            <span className="shrink-0 rounded-full border border-[#f0c674]/40 bg-[#f0c674]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#f0c674]">
              $10/session
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60">
            Pick an upcoming session, pay securely with Stripe, and you&apos;re registered.
          </p>
          <div className="mt-6">
            <GroupSessionList
              sessions={sessions.map((s) => ({
                ...s,
                spotsTaken: spotsTakenBySession.get(s.id) ?? 0,
                registered: registeredSessionIds.has(s.id),
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
