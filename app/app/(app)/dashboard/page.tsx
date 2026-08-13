import Link from 'next/link';
import { requireSession, canUse } from '@/lib/session';
import { getMetrics, getMindsetLessons, getSubmissions } from '@/lib/data';
import { TIER_LABEL } from '@/lib/types';
import { Button, Card, Eyebrow, Stat, ProgressBar } from '@/components/ui';

export const metadata = { title: 'Dashboard — Mindset Hockey' };

export default async function DashboardPage() {
  const session = await requireSession();

  const premium = canUse(session, 'mindset_training');
  const inactive = !session.subscriptionActive && session.role !== 'admin';

  const [metrics, lessons, submissions] = await Promise.all([
    canUse(session, 'basic_tracking') ? getMetrics(session) : Promise.resolve([]),
    premium ? getMindsetLessons(session) : Promise.resolve([]),
    premium ? getSubmissions(session) : Promise.resolve([]),
  ]);

  const lessonsDone = lessons.filter((l) => l.completed).length;
  const openReviews = submissions.filter((s) => s.status !== 'reviewed').length;
  const trackedKinds = new Set(metrics.map((m) => m.kind)).size;
  const latestScore = metrics.filter((m) => m.kind === 'analysis_score').slice(-1)[0];

  const firstName = (session.fullName || session.email).split(/[ @]/)[0];

  return (
    <div>
      <Eyebrow>{TIER_LABEL[session.tier]} member</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Welcome back, {firstName}</h1>

      {inactive && (
        <Card className="mt-6 border-amber/40 bg-amber/[.06] p-5">
          <h3 className="display text-[18px]">Your subscription isn&apos;t active</h3>
          <p className="mt-2 text-[14.5px] text-silver-dim">
            Member content is locked until billing is back in good standing. Nothing has been
            deleted — it all comes back the moment payment goes through.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/account">Manage Billing</Button>
            <Button href="/upgrade" variant="ghost">See Plans</Button>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Mindset lessons"
          value={lessons.length ? `${lessonsDone}/${lessons.length}` : '—'}
          sub={lessons.length ? 'Completed' : 'Premium feature'}
        />
        <Stat
          label="Film in review"
          value={premium ? String(openReviews) : '—'}
          sub={premium ? 'Awaiting coach feedback' : 'Premium feature'}
        />
        <Stat label="Tracked metrics" value={String(trackedKinds)} sub="Series with data" />
        <Stat
          label="Latest shot score"
          value={latestScore ? String(Math.round(latestScore.value)) : '—'}
          sub={latestScore ? 'From your last review' : 'No data yet'}
        />
      </div>

      <h2 className="display mt-10 text-[22px]">What to do next</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premium ? (
          <>
            <Card hover className="p-6">
              <h3 className="display text-[19px]">Send film for review</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                Game or practice footage, reviewed by a named coach with written notes back
                inside 72 hours.
              </p>
              <div className="mt-4">
                <Button href="/reviews/new" size="sm">Submit Footage</Button>
              </div>
            </Card>
            <Card hover className="p-6">
              <h3 className="display text-[19px]">
                {lessonsDone < lessons.length ? 'Continue mindset training' : 'Mindset training'}
              </h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                {lessons.find((l) => !l.completed)?.title ?? 'All lessons complete — nice work.'}
              </p>
              <div className="mt-4">
                <Button href="/mindset" size="sm" variant="ghost">Open Mindset</Button>
              </div>
            </Card>
            <Card hover className="p-6">
              <h3 className="display text-[19px]">This week&apos;s training</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                Your strength plan and meal plan, built around where you are in the season.
              </p>
              <div className="mt-4 flex gap-2">
                <Button href="/workouts" size="sm" variant="ghost">Workouts</Button>
                <Button href="/nutrition" size="sm" variant="ghost">Nutrition</Button>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card hover className="p-6">
              <h3 className="display text-[19px]">Your workout plan</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                Hockey-specific strength work, periodised around your season.
              </p>
              <div className="mt-4">
                <Button href="/workouts" size="sm">Open Workouts</Button>
              </div>
            </Card>
            <Card hover className="p-6">
              <h3 className="display text-[19px]">Log your progress</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                Track shot speed, lifts and personal records so improvement is a number.
              </p>
              <div className="mt-4">
                <Button href="/progress" size="sm" variant="ghost">Open Progress</Button>
              </div>
            </Card>
            <Card hover className="border-electric/30 bg-electric/[.05] p-6">
              <h3 className="display text-[19px]">Upgrade to Premium</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">
                Adds nutrition planning, mindset development, video review, advanced tracking
                and AI Shot Analysis.
              </p>
              <div className="mt-4">
                <Button href="/upgrade?need=premium" size="sm">See Premium</Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {submissions.length > 0 && (
        <>
          <h2 className="display mt-10 text-[22px]">Recent activity</h2>
          <div className="mt-4 grid gap-2">
            {submissions.slice(0, 4).map((s) => (
              <Link key={s.id} href="/reviews">
                <Card hover className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-white">{s.title}</p>
                    <p className="truncate text-[13px] capitalize text-silver-dim">
                      {s.kind} · {s.status.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-silver-dim">
                    {new Date(s.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {latestScore && (
        <div className="mt-8 max-w-md">
          <ProgressBar
            value={Math.round(latestScore.value)}
            label="Latest shot mechanics score"
          />
        </div>
      )}
    </div>
  );
}
