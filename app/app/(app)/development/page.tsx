import Link from 'next/link';
import { requireSession, canUse } from '@/lib/session';
import {
  getPlayerProfile,
  getMindsetLessons,
  getWorkoutRoutines,
  getWorkoutActivityStats,
  getSubmissions,
  getLatestAnalysis,
  pickOfTheDay,
  OCCASION_NUTRITION_CATEGORY,
  isRoutineOccasion,
} from '@/lib/data';
import { getCookbook, type RecipeCard } from '@/lib/nutrition';
import { getPillarRecommendations, type PillarRecommendation } from '@/lib/library';
import { CATEGORY_SHORT_LABEL } from '@/lib/ai/recommendations';
import { parseCategories, formatDate } from '@/lib/ai/present';
import { Button, Card, EmptyState, Eyebrow, PageHeading, PillarChip, ProgressBar } from '@/components/ui';

export const metadata = { title: 'Development Plan — Mindset Hockey' };

/** Reads real, per-player data (progress, recommendations), so this must
 *  never be cached across players or across a session. */
export const dynamic = 'force-dynamic';

const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  uploading: 'Uploading',
  queued: 'Queued',
  in_review: 'With a coach',
  reviewed: 'Feedback ready',
  failed: 'Upload failed',
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Same label maps as the dashboard — display-only, never used to filter
// content (workout_plans / training_resources / mindset_lessons have no
// level or position columns, so no content is actually level/position-aware
// yet; see the architecture note above).
const POSITION_LABEL: Record<string, string> = {
  forward: 'Forward',
  defense: 'Defence',
  goalie: 'Goaltender',
};

const LEVEL_LABEL: Record<string, string> = {
  house: 'House / Rec',
  a: 'A',
  aa: 'AA',
  aaa: 'AAA',
  prep: 'Prep',
  junior: 'Junior',
  college: 'College',
};

/* ==========================================================================
   THE DEVELOPMENT PLAN

   Answers "what should I work on right now" using data that already exists —
   no assignment table, no coach-authored weekly plan, no AI recommendation
   engine. Everything here is either:

     - the player's own stated data (players.focus_pillars, players.level,
       players.position — set at onboarding / Edit Profile)
     - real progress already tracked by an existing table (mindset_progress,
       workout_completions, video_submissions, shot_analyses)
     - a deterministic pick over real published content, using the exact same
       helpers the dashboard and library already use (getPillarRecommendations,
       pickOfTheDay, getMindsetLessons) — not a second recommendation system

   "This week's mindset lesson" is the one deterministic idea unique to this
   page: mindset_lessons.week is real, existing content metadata (0002) that
   nothing previously read for sequencing. A player's own players.created_at
   (also existing) seeds a week counter that advances by real calendar weeks
   and cycles through the published weeks in order — a real progression, not
   a random pick, and not a fabricated "coach assigned this" claim.
   ========================================================================== */

export default async function DevelopmentPlanPage() {
  const session = await requireSession();
  const player = await getPlayerProfile(session);

  const premiumMindset = canUse(session, 'mindset_training');
  const videoReview = canUse(session, 'video_review');
  const workoutPlans = canUse(session, 'workout_plans');
  const aiShotAnalysis = canUse(session, 'ai_shot_analysis');
  const nutritionPlans = canUse(session, 'nutrition_plans');

  const [mindsetLessons, pillarRecommendations, routines, workoutActivity, submissions, latestAnalysis] =
    await Promise.all([
      premiumMindset ? getMindsetLessons(session) : Promise.resolve([]),
      player && player.focusPillars.length > 0
        ? getPillarRecommendations(session, player.focusPillars, 3)
        : Promise.resolve<PillarRecommendation[]>([]),
      workoutPlans ? getWorkoutRoutines() : Promise.resolve([]),
      workoutPlans ? getWorkoutActivityStats(session) : Promise.resolve({ streakDays: 0, completedThisWeek: 0 }),
      videoReview ? getSubmissions(session) : Promise.resolve([]),
      aiShotAnalysis ? getLatestAnalysis(session) : Promise.resolve(null),
    ]);

  // No player profile at all — nothing below can be personalized honestly.
  if (!player) {
    return (
      <>
        <PageHeading eyebrow="Development plan" title="Your development plan" />
        <EmptyState
          title="Complete your player profile to build your development experience"
          body="Level, position, stick flex and your development pillars are what this page is built from — takes about 60 seconds."
          action={<Button href="/onboarding">Set up your player</Button>}
        />
      </>
    );
  }

  const mindsetDone = mindsetLessons.filter((l) => l.completed).length;
  const todaysRoutine = pickOfTheDay(routines);

  // "This week's" mindset lesson — cycles through the real published weeks in
  // order, advancing one per real calendar week since the player was set up.
  // Never invents a week that doesn't exist in the content.
  const publishedWeeks = [...new Set(mindsetLessons.map((l) => l.week))].sort((a, b) => a - b);
  let thisWeekLesson: (typeof mindsetLessons)[number] | null = null;
  let weekNumber: number | null = null;
  if (publishedWeeks.length > 0) {
    const weeksSinceSetup = Math.floor((Date.now() - new Date(player.createdAt).getTime()) / ONE_WEEK_MS);
    weekNumber = weeksSinceSetup + 1;
    const targetWeek = publishedWeeks[Math.max(0, weeksSinceSetup) % publishedWeeks.length];
    thisWeekLesson = mindsetLessons.find((l) => l.week === targetWeek) ?? null;
  }

  // Coach feedback — the most recent submission a coach has actually
  // published notes on. Reuses video_submissions.status, set only by
  // POST /api/coach/reviews/[id]/feedback when complete=true.
  const latestReviewed = submissions.find((s) => s.status === 'reviewed') ?? null;
  const awaitingReview = submissions.filter((s) => s.status === 'queued' || s.status === 'in_review').length;

  // Nutrition — identical occasion -> category pick the dashboard uses, so
  // both surfaces agree on "today's" recommendation rather than each
  // inventing their own.
  let nutritionPick: RecipeCard | null = null;
  if (nutritionPlans && todaysRoutine && isRoutineOccasion(todaysRoutine.occasion)) {
    const category = OCCASION_NUTRITION_CATEGORY[todaysRoutine.occasion];
    if (category) {
      const cookbook = await getCookbook({ category });
      nutritionPick = cookbook.recipes[0] ?? null;
    }
  }

  // The latest analysis row can be mid-pipeline (uploading/queued/analyzing)
  // or failed — only 'analyzed'/'in_review'/'reviewed' actually carry real
  // scores. Treating any non-null row as "graded" would misreport a failed
  // or still-processing analysis as a completed, strong result.
  let weakestCategoryLabel: string | null = null;
  let analysisState: 'complete' | 'processing' | 'failed' | null = null;
  if (aiShotAnalysis && latestAnalysis) {
    analysisState =
      latestAnalysis.status === 'failed'
        ? 'failed'
        : latestAnalysis.status === 'analyzed' ||
            latestAnalysis.status === 'in_review' ||
            latestAnalysis.status === 'reviewed'
          ? 'complete'
          : 'processing';

    if (analysisState === 'complete') {
      const gradeable = parseCategories(latestAnalysis.category_scores).filter((c) => c.score !== null);
      if (gradeable.length > 0) {
        const weakest = gradeable.reduce((a, b) => (b.score! < a.score! ? b : a));
        weakestCategoryLabel = CATEGORY_SHORT_LABEL[weakest.key] ?? weakest.key;
      }
    }
  }

  // Today's short checklist — only items with something real behind them.
  const todayItems: { label: string; href: string }[] = [];
  if (todaysRoutine) {
    todayItems.push({ label: `Workout: ${todaysRoutine.title}`, href: `/workouts/${todaysRoutine.slug}` });
  }
  if (thisWeekLesson && !thisWeekLesson.completed) {
    todayItems.push({ label: `Mindset lesson: ${thisWeekLesson.title}`, href: `/mindset/${thisWeekLesson.slug}` });
  }
  if (latestReviewed) {
    todayItems.push({ label: 'New coach feedback is ready', href: `/reviews/${latestReviewed.id}` });
  }

  return (
    <>
      <PageHeading
        eyebrow="Development plan"
        title={`${player.firstName}'s development plan`}
        sub="Built from your profile and your real progress — nothing here is fabricated or coach-assigned unless a coach actually did it."
      />

      {(player.position || player.level) && (
        <p className="-mt-2 mb-1 text-[13.5px] font-semibold uppercase tracking-[.1em] text-electric-glow">
          {POSITION_LABEL[player.position]} · {LEVEL_LABEL[player.level]}
          {player.trainingDaysGoal ? ` · ${player.trainingDaysGoal}x/week` : ''}
        </p>
      )}

      {/* CURRENT FOCUS */}
      <Card className="p-6">
        <Eyebrow>Current Focus</Eyebrow>
        {player.focusPillars.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {player.focusPillars.map((p) => (
              <PillarChip key={p} pillar={p} />
            ))}
          </div>
        ) : (
          <>
            <p className="mt-3 text-[14.5px] text-silver-dim">
              You haven&apos;t chosen a development focus yet — the rest of this page personalizes
              once you do.
            </p>
            <div className="mt-4">
              <Button href="/profile" size="sm">Choose Your Focus</Button>
            </div>
          </>
        )}
      </Card>

      {/* TODAY */}
      {todayItems.length > 0 && (
        <Card hover className="mt-5 border-electric/30 bg-electric/[.06] p-6">
          <Eyebrow>Today</Eyebrow>
          <ol className="mt-3 grid gap-2.5">
            {todayItems.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-navy-900/60 px-4 py-3.5 transition-colors hover:border-electric/40"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-electric text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-white">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-silver-dim">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* THIS WEEK */}
      <Card className="mt-5 p-6">
        <Eyebrow>This Week{weekNumber ? ` · Week ${weekNumber}` : ''}</Eyebrow>
        <div className="mt-3 grid gap-3">
          {thisWeekLesson ? (
            <Link href={`/mindset/${thisWeekLesson.slug}`}>
              <Card hover className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
                    Mindset lesson
                  </p>
                  <p className="mt-1 truncate text-[14.5px] font-semibold text-white">
                    {thisWeekLesson.title}
                  </p>
                </div>
                <span className="shrink-0 text-silver-dim">
                  {thisWeekLesson.completed ? '✓' : '→'}
                </span>
              </Card>
            </Link>
          ) : premiumMindset ? (
            <Card className="p-4">
              <p className="text-[13.5px] text-silver-dim">
                New mindset lessons are on the way — check back soon.
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-[13.5px] text-silver-dim">
                Mindset training is included with Premium.{' '}
                <Link href="/upgrade?need=premium&f=mindset_training" className="text-electric-glow underline underline-offset-4">
                  Upgrade
                </Link>{' '}
                to see this week&apos;s lesson.
              </p>
            </Card>
          )}

          {todaysRoutine ? (
            <Link href={`/workouts/${todaysRoutine.slug}`}>
              <Card hover className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">Training</p>
                  <p className="mt-1 truncate text-[14.5px] font-semibold text-white">
                    {todaysRoutine.title}
                  </p>
                </div>
                <span className="shrink-0 text-silver-dim">→</span>
              </Card>
            </Link>
          ) : !workoutPlans ? (
            <Card className="p-4">
              <p className="text-[13.5px] text-silver-dim">
                Workout routines are included with Standard and Premium.{' '}
                <Link href="/upgrade?need=basic&f=workout_plans" className="text-electric-glow underline underline-offset-4">
                  Upgrade
                </Link>
                .
              </p>
            </Card>
          ) : null}

          {nutritionPick && (
            <Link href={`/nutrition/${nutritionPick.slug}`}>
              <Card hover className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">Nutrition</p>
                  <p className="mt-1 truncate text-[14.5px] font-semibold text-white">{nutritionPick.title}</p>
                </div>
                <span className="shrink-0 text-silver-dim">→</span>
              </Card>
            </Link>
          )}
        </div>
      </Card>

      {/* RECOMMENDED — pillar-matched training resources */}
      <Card className="mt-5 p-6">
        <Eyebrow>Recommended for Your Focus</Eyebrow>
        {pillarRecommendations.length > 0 ? (
          <div className="mt-3 grid gap-4">
            {pillarRecommendations.map(({ pillar, resources }) => (
              <div key={pillar}>
                <div className="mb-2">
                  <PillarChip pillar={pillar} />
                </div>
                <div className="grid gap-2">
                  {resources.map((r) => (
                    <Link key={r.id} href={r.locked ? `/upgrade?need=${r.requiredTier}` : `/library/${r.id}`}>
                      <Card hover className="flex items-center justify-between gap-3 p-3.5">
                        <p className="min-w-0 truncate text-[14px] font-semibold text-white">{r.title}</p>
                        <span className="shrink-0 text-silver-dim">{r.locked ? '🔒' : '→'}</span>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : player.focusPillars.length > 0 ? (
          <p className="mt-3 text-[14.5px] text-silver-dim">
            Your coaches are adding content for this focus — check back soon.
          </p>
        ) : null}
      </Card>

      {/* PROGRESS — real numbers only */}
      <Card className="mt-5 p-6">
        <Eyebrow>Progress</Eyebrow>
        <div className="mt-3 grid gap-4">
          {premiumMindset && mindsetLessons.length > 0 && (
            <ProgressBar
              value={Math.round((mindsetDone / mindsetLessons.length) * 100)}
              label={`Mindset lessons — ${mindsetDone} of ${mindsetLessons.length}`}
            />
          )}

          {workoutPlans && (
            <div className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-silver-dim">Workouts this week</span>
              <span className="font-semibold text-white">{workoutActivity.completedThisWeek}</span>
            </div>
          )}
          {workoutPlans && workoutActivity.streakDays > 0 && (
            <div className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-silver-dim">Current streak</span>
              <span className="font-semibold text-white">🔥 {workoutActivity.streakDays} days</span>
            </div>
          )}

          {videoReview && submissions.length > 0 && (
            <div className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-silver-dim">Video reviews submitted</span>
              <span className="font-semibold text-white">
                {submissions.length} ({awaitingReview} awaiting a coach)
              </span>
            </div>
          )}

          {aiShotAnalysis && latestAnalysis && (
            <div className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-silver-dim">Latest AI Shot Analysis</span>
              <span className="font-semibold text-white">
                {analysisState === 'complete' && latestAnalysis.overall_score !== null
                  ? `${latestAnalysis.overall_score}/100`
                  : analysisState === 'failed'
                    ? 'Failed'
                    : 'In progress'}
              </span>
            </div>
          )}

          {!(premiumMindset && mindsetLessons.length > 0) &&
            !(videoReview && submissions.length > 0) &&
            !(aiShotAnalysis && latestAnalysis) &&
            workoutActivity.completedThisWeek === 0 && (
              <p className="text-[14.5px] text-silver-dim">
                Your training progress will appear here as you complete workouts, mindset lessons,
                video reviews and shot analyses.
              </p>
            )}
        </div>
      </Card>

      {/* COACH FEEDBACK + AI INSIGHT */}
      {(latestReviewed || (aiShotAnalysis && latestAnalysis)) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {latestReviewed && (
            <Card className="p-5">
              <Eyebrow>Coach Feedback</Eyebrow>
              <p className="mt-3 text-[14.5px] font-semibold text-white">{latestReviewed.title}</p>
              <p className="mt-1 text-[12.5px] text-silver-dim">
                {SUBMISSION_STATUS_LABEL[latestReviewed.status] ?? latestReviewed.status} ·{' '}
                {formatDate(latestReviewed.created_at)}
              </p>
              <div className="mt-4">
                <Button href={`/reviews/${latestReviewed.id}`} size="sm" variant="ghost">
                  Read Feedback
                </Button>
              </div>
            </Card>
          )}

          {aiShotAnalysis && latestAnalysis && (
            <Card className="p-5">
              <Eyebrow>AI Shot Analysis</Eyebrow>
              {analysisState === 'failed' ? (
                <p className="mt-3 text-[14.5px] text-silver-dim">Your last shot analysis didn&apos;t complete.</p>
              ) : analysisState === 'processing' ? (
                <p className="mt-3 text-[14.5px] text-silver-dim">
                  Your last shot is still being analyzed — check back soon.
                </p>
              ) : weakestCategoryLabel ? (
                <>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
                    Needs the most work
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-white">{weakestCategoryLabel}</p>
                </>
              ) : (
                <p className="mt-3 text-[14.5px] text-silver-dim">Your last shot graded strong across the board.</p>
              )}
              <div className="mt-4">
                <Button href={`/analysis/${latestAnalysis.id}`} size="sm" variant="ghost">
                  View Analysis
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
