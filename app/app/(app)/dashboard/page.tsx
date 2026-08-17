import Link from 'next/link';
import { requireSession, canUse, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { getMetrics, getMindsetLessons, getSubmissions } from '@/lib/data';
import { TIER_LABEL } from '@/lib/types';
import { Button, Card, Eyebrow, Stat, ProgressBar } from '@/components/ui';
import { STATUS_LABEL, STATUS_CLASS, formatDate, type AnalysisStatus } from '@/lib/ai/present';

export const metadata = { title: 'Dashboard — Mindset Hockey' };

interface RecentAnalysis {
  id: string;
  status: AnalysisStatus;
  overall_score: number | null;
  shot_type: string;
  angle: string;
  created_at: string;
}

async function loadRecentAnalyses(): Promise<RecentAnalysis[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();
  // RLS scopes this to the caller's own rows.
  const { data } = await supabase
    .from('shot_analyses')
    .select('id, status, overall_score, shot_type, angle, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  return (data ?? []) as RecentAnalysis[];
}

export default async function DashboardPage() {
  const session = await requireSession();

  const premium = canUse(session, 'mindset_training');
  const aiShotAnalysis = canUse(session, 'ai_shot_analysis');
  const inactive = !session.subscriptionActive && session.role !== 'admin';

  const [metrics, lessons, submissions, recentAnalyses] = await Promise.all([
    canUse(session, 'basic_tracking') ? getMetrics(session) : Promise.resolve([]),
    premium ? getMindsetLessons(session) : Promise.resolve([]),
    premium ? getSubmissions(session) : Promise.resolve([]),
    aiShotAnalysis ? loadRecentAnalyses() : Promise.resolve([]),
  ]);

  const lessonsDone = lessons.filter((l) => l.completed).length;
  const openReviews = submissions.filter((s) => s.status !== 'reviewed').length;
  const trackedKinds = new Set(metrics.map((m) => m.kind)).size;
  const latestScore = metrics.filter((m) => m.kind === 'analysis_score').slice(-1)[0];

  const firstName = (session.fullName || session.email).split(/[ @]/)[0];

  return (
    <div>
      {/* 1. WELCOME / STATUS */}
      <Eyebrow>{TIER_LABEL[session.tier]} member</Eyebrow>
      <h1 className="display text-[clamp(26px,5vw,44px)]">Welcome back, {firstName}</h1>

      {inactive && (
        <Card className="mt-5 border-amber/40 bg-amber/[.06] p-4 sm:mt-6 sm:p-5">
          <h3 className="display text-[17px] sm:text-[18px]">Your subscription isn&apos;t active</h3>
          <p className="mt-2 text-[13.5px] text-silver-dim sm:text-[14.5px]">
            Member content is locked until billing is back in good standing. Nothing has been
            deleted — it all comes back the moment payment goes through.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/account">Manage Billing</Button>
            <Button href="/upgrade" variant="ghost">See Plans</Button>
          </div>
        </Card>
      )}

      {/* 2. AI SHOT ANALYSIS — the single most-used feature, so it gets the
          top slot on mobile right after the welcome banner. */}
      {aiShotAnalysis ? (
        <Card hover className="mt-5 border-electric/25 bg-electric/[.05] p-4 sm:mt-6 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-[18px] sm:text-[20px]">AI Shot Analysis</h2>
            <span className="rounded bg-electric/20 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-electric-glow">
              AI
            </span>
          </div>
          <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
            Upload a clip, get it graded on ten mechanics categories in minutes.
          </p>
          <div className="mt-3.5 sm:mt-4">
            <Button href="/analysis/new" size="sm">Analyze a Shot</Button>
          </div>
        </Card>
      ) : (
        <Card className="mt-5 p-4 sm:mt-6 sm:p-6">
          <h2 className="display text-[18px] sm:text-[20px]">AI Shot Analysis</h2>
          <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
            Upload a clip and get it graded on ten mechanics categories — included with Standard
            and Premium.
          </p>
          <div className="mt-3.5 sm:mt-4">
            <Button href="/upgrade?need=basic&f=ai_shot_analysis" size="sm" variant="ghost">
              Unlock AI Shot Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* 3. RECENT ANALYSIS */}
      {aiShotAnalysis && recentAnalyses.length > 0 && (
        <div className="mt-5 sm:mt-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-[17px] sm:text-[19px]">Recent analysis</h2>
            <Link href="/analysis" className="-m-1 inline-block p-1 text-[13.5px] text-silver-dim hover:text-white">
              View all
            </Link>
          </div>
          <div className="mt-3 grid gap-2">
            {recentAnalyses.map((r) => (
              <Link key={r.id} href={`/analysis/${r.id}`}>
                <Card hover className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-navy-900">
                    {r.overall_score !== null ? (
                      <span className="display text-[16px] leading-none text-electric-glow">
                        {r.overall_score}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-silver-dim">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold capitalize text-white">
                      {r.shot_type.replace('_', ' ')} · {r.angle} angle
                    </p>
                    <p className="text-[11.5px] text-silver-dim">{formatDate(r.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.1em] ${
                      STATUS_CLASS[r.status] ?? STATUS_CLASS.queued
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <h2 className="display mt-8 text-[19px] sm:mt-10 sm:text-[22px]">What to do next</h2>
      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premium ? (
          <>
            <Card hover className="p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">Send film for review</h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                Game or practice footage, reviewed by a named coach with written notes back
                inside 72 hours.
              </p>
              <div className="mt-3 sm:mt-4">
                <Button href="/reviews/new" size="sm">Submit Footage</Button>
              </div>
            </Card>
            <Card hover className="p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">
                {lessonsDone < lessons.length ? 'Continue mindset training' : 'Mindset training'}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                {lessons.find((l) => !l.completed)?.title ?? 'All lessons complete — nice work.'}
              </p>
              <div className="mt-3 sm:mt-4">
                <Button href="/mindset" size="sm" variant="ghost">Open Mindset</Button>
              </div>
            </Card>
            <Card hover className="p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">This week&apos;s training</h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                Your strength plan and meal plan, built around where you are in the season.
              </p>
              <div className="mt-3 flex gap-2 sm:mt-4">
                <Button href="/workouts" size="sm" variant="ghost">Workouts</Button>
                <Button href="/nutrition" size="sm" variant="ghost">Nutrition</Button>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card hover className="p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">Your workout plan</h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                Hockey-specific strength work, periodised around your season.
              </p>
              <div className="mt-3 sm:mt-4">
                <Button href="/workouts" size="sm">Open Workouts</Button>
              </div>
            </Card>
            <Card hover className="p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">Log your progress</h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                Track shot speed, lifts and personal records so improvement is a number.
              </p>
              <div className="mt-3 sm:mt-4">
                <Button href="/progress" size="sm" variant="ghost">Open Progress</Button>
              </div>
            </Card>
            <Card hover className="border-electric/30 bg-electric/[.05] p-4 sm:p-6">
              <h3 className="display text-[17px] sm:text-[19px]">Upgrade to Premium</h3>
              <p className="mt-1.5 text-[13.5px] text-silver-dim sm:mt-2 sm:text-[14.5px]">
                Adds nutrition planning, mindset development, video review, advanced tracking
                and AI Shot Analysis.
              </p>
              <div className="mt-3 sm:mt-4">
                <Button href="/upgrade?need=premium" size="sm">See Premium</Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {submissions.length > 0 && (
        <>
          <h2 className="display mt-8 text-[19px] sm:mt-10 sm:text-[22px]">Recent activity</h2>
          <div className="mt-3 grid gap-2 sm:mt-4">
            {submissions.slice(0, 4).map((s) => (
              <Link key={s.id} href="/reviews">
                <Card hover className="flex items-center gap-4 p-3.5 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-white sm:text-[14.5px]">{s.title}</p>
                    <p className="truncate text-[13px] capitalize text-silver-dim sm:text-[13.5px]">
                      {s.kind} · {s.status.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-silver-dim sm:text-[12px]">
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

      {/* 4. TRAINING RESOURCES */}
      <h2 className="display mt-8 text-[19px] sm:mt-10 sm:text-[22px]">Training resources</h2>
      <Link href="/library">
        <Card hover className="mt-3 flex items-center justify-between gap-4 p-4 sm:mt-4 sm:p-5">
          <div>
            <p className="text-[14px] font-semibold text-white sm:text-[15px]">
              Browse the training library
            </p>
            <p className="mt-0.5 text-[13.5px] text-silver-dim sm:text-[14px]">
              Lessons and drills across all six pillars, filtered to your tier.
            </p>
          </div>
          <span className="shrink-0 text-silver-dim">→</span>
        </Card>
      </Link>

      {/* 5. PROGRESS */}
      {latestScore && (
        <div className="mt-6 max-w-md sm:mt-8">
          <ProgressBar
            value={Math.round(latestScore.value)}
            label="Latest shot mechanics score"
          />
        </div>
      )}
    </div>
  );
}
