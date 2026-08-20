import Link from 'next/link';
import { requireSession, canUse, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getSubmissions,
  getWorkoutRoutines,
  getWorkoutActivityStats,
  getMindsetLessons,
  getPlayerProfile,
  OCCASION_LABEL,
  OCCASION_NUTRITION_CATEGORY,
  isRoutineOccasion,
} from '@/lib/data';
import { getCookbook, type RecipeCard } from '@/lib/nutrition';
import { CATEGORY_SHORT_LABEL } from '@/lib/ai/recommendations';
import {
  getDrillRecommendation,
  getPillarRecommendations,
  type DrillRecommendation,
  type PillarRecommendation,
} from '@/lib/library';
import { parseCategories, formatDate, type AnalysisStatus } from '@/lib/ai/present';
import { Button, Card, Eyebrow, PillarChip } from '@/components/ui';

export const metadata = { title: 'Dashboard — Mindset Hockey' };

interface RecentAnalysis {
  id: string;
  status: AnalysisStatus;
  overall_score: number | null;
  shot_type: string;
  angle: string;
  created_at: string;
  category_scores: unknown;
}

async function loadLatestAnalysis(): Promise<RecentAnalysis | null> {
  if (DEMO_MODE) return null;
  const supabase = await createServerClient();
  // RLS scopes this to the caller's own rows.
  const { data } = await supabase
    .from('shot_analyses')
    .select('id, status, overall_score, shot_type, angle, created_at, category_scores')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RecentAnalysis | null) ?? null;
}

/** Deterministic "pick of the day" — no client JS, no fake AI, just a stable
 *  rotation so the same routine shows all day and a different one tomorrow. */
function pickOfTheDay<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return items[dayIndex % items.length];
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

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

export default async function DashboardPage() {
  const session = await requireSession();

  const premium = canUse(session, 'mindset_training');
  const aiShotAnalysis = canUse(session, 'ai_shot_analysis');
  const workoutPlans = canUse(session, 'workout_plans');
  const nutritionPlans = canUse(session, 'nutrition_plans');
  const inactive = !session.subscriptionActive && session.role !== 'admin';

  // Read first — the pillar-recommendation fetch below depends on it, so it
  // cannot join the Promise.all batch that only depends on tier/role.
  const player = await getPlayerProfile(session);

  const [submissions, latestAnalysis, routines, activity, mindsetLessons, pillarRecommendations] =
    await Promise.all([
      premium ? getSubmissions(session) : Promise.resolve([]),
      aiShotAnalysis ? loadLatestAnalysis() : Promise.resolve(null),
      workoutPlans ? getWorkoutRoutines() : Promise.resolve([]),
      workoutPlans ? getWorkoutActivityStats(session) : Promise.resolve({ streakDays: 0, completedThisWeek: 0 }),
      premium ? getMindsetLessons(session) : Promise.resolve([]),
      player && player.focusPillars.length > 0
        ? getPillarRecommendations(session, player.focusPillars)
        : Promise.resolve<PillarRecommendation[]>([]),
    ]);
  const mindsetDone = mindsetLessons.filter((l) => l.completed).length;

  const todaysRoutine = pickOfTheDay(routines);

  // --------------------------------------------------------------------
  // AI INSIGHT — weakest gradeable category, then the single admin-
  // controlled drill mapped to it (lib/library.ts getDrillRecommendation,
  // backed by the ai_drill_recommendations table — never a hardcoded
  // category -> drill switch). Wrapped defensively: a bug here must never
  // take out the rest of the dashboard.
  // --------------------------------------------------------------------
  let weakestCategoryLabel: string | null = null;
  let drillRecommendation: DrillRecommendation | null = null;
  if (aiShotAnalysis && latestAnalysis) {
    try {
      const categories = parseCategories(latestAnalysis.category_scores);
      const gradeable = categories.filter((c) => c.score !== null);
      if (gradeable.length > 0) {
        const weakest = gradeable.reduce((a, b) => (b.score! < a.score! ? b : a));
        weakestCategoryLabel = CATEGORY_SHORT_LABEL[weakest.key] ?? weakest.key;
        drillRecommendation = await getDrillRecommendation(session, weakest.key);
      }
    } catch (err) {
      console.error('[dashboard] AI insight lookup failed:', (err as Error).message);
    }
  }

  // Nutrition recommendation: today's routine occasion -> a category, one recipe.
  let nutritionPick: RecipeCard | null = null;
  if (nutritionPlans && todaysRoutine && isRoutineOccasion(todaysRoutine.occasion)) {
    const category = OCCASION_NUTRITION_CATEGORY[todaysRoutine.occasion];
    if (category) {
      const cookbook = await getCookbook({ category });
      nutritionPick = cookbook.recipes[0] ?? null;
    }
  }

  const firstName = player?.firstName || (session.fullName || session.email).split(/[ @]/)[0];
  const positionLevelLine =
    player && (player.level || player.position)
      ? `${POSITION_LABEL[player.position]} · ${LEVEL_LABEL[player.level]}${
          player.trainingDaysGoal ? ` · ${player.trainingDaysGoal}x/week` : ''
        }`
      : null;
  const streakLine =
    activity.streakDays > 0
      ? `🔥 ${activity.streakDays}-day streak`
      : inactive
        ? 'Billing needs attention — your content is safe.'
        : 'Start a routine today to begin a streak.';

  // "View More" — everything that isn't Today's Focus / AI Insight /
  // Nutrition Pick lives behind one disclosure instead of its own card.
  const hasMore = workoutPlans || (premium && submissions.length > 0) || (premium && mindsetLessons.length > 0);

  return (
    <div className="max-w-2xl overflow-x-hidden">
      {/* WELCOME — greeting + exactly one status line (the streak). No other
          metric repeats this number anywhere else on the page. */}
      <p className="text-base font-semibold uppercase tracking-[.14em] text-silver-dim">
        {timeOfDayGreeting()}
      </p>
      <h1 className="display mt-1 text-[clamp(28px,7vw,40px)]">{firstName}</h1>
      {positionLevelLine && (
        <p className="mt-1 text-[13.5px] font-semibold uppercase tracking-[.1em] text-electric-glow">
          {positionLevelLine}
        </p>
      )}
      <p className="mt-2 text-lg text-silver-dim">{streakLine}</p>

      {!player && session.role === 'member' && (
        <Card className="mt-5 border-electric/30 bg-electric/[.06] p-5">
          <h3 className="display text-lg">Finish setting up your player</h3>
          <p className="mt-1.5 text-base text-silver-dim">
            Level, position, stick flex and training days — about 60 seconds, and it&apos;s what
            personalizes everything below.
          </p>
          <div className="mt-3">
            <Button href="/onboarding" size="sm">Set Up Player</Button>
          </div>
        </Card>
      )}

      {inactive && (
        <Card className="mt-5 border-amber/40 bg-amber/[.06] p-5">
          <h3 className="display text-lg">Your subscription isn&apos;t active</h3>
          <p className="mt-1.5 text-base text-silver-dim">
            Nothing has been deleted — it all comes back the moment payment goes through.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button href="/account" size="sm">Manage Billing</Button>
            <Button href="/upgrade" size="sm" variant="ghost">See Plans</Button>
          </div>
        </Card>
      )}

      {/* TODAY'S FOCUS — dominant. Nothing on this page outranks it: the
          largest type, the most padding, the only unmissable button. */}
      <Card hover className="mt-7 border-electric/30 bg-electric/[.06] p-6">
        <Eyebrow>Today&apos;s Focus</Eyebrow>
        {todaysRoutine ? (
          <>
            <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">{todaysRoutine.title}</h2>
            <p className="mt-3 text-lg text-silver-dim">
              {OCCASION_LABEL[todaysRoutine.occasion as keyof typeof OCCASION_LABEL] ?? todaysRoutine.occasion}
              {todaysRoutine.durationMin ? ` · ${todaysRoutine.durationMin} min` : ''}
            </p>
            <p className="mt-1 text-base text-silver-dim">
              {todaysRoutine.equipment.length > 0 ? todaysRoutine.equipment.join(', ') : 'No equipment needed'}
            </p>
            <div className="mt-6">
              <Button href={`/workouts/${todaysRoutine.slug}`} size="lg">Start Workout</Button>
            </div>
          </>
        ) : workoutPlans ? (
          <>
            <h2 className="display mt-3 text-2xl sm:text-3xl">Browse structured routines</h2>
            <p className="mt-2 text-lg text-silver-dim">
              Pick an occasion — game day, practice, recovery — and get a routine ready to go.
            </p>
            <div className="mt-6">
              <Button href="/workouts" size="lg">Open Workouts</Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="display mt-3 text-2xl sm:text-3xl">Structured workout routines</h2>
            <p className="mt-2 text-lg text-silver-dim">
              Game-day, practice and recovery routines — included with Standard and Premium.
            </p>
            <div className="mt-6">
              <Button href="/upgrade?need=basic&f=workout_plans" variant="ghost">Unlock Workouts</Button>
            </div>
          </>
        )}
      </Card>

      {/* DEVELOPMENT FOCUS — deterministic: the player's own focus_pillars
          (players table) matched directly against training_resources.pillar
          (same column /library filters on). No AI, no invented relevance —
          a pillar with nothing published for it simply doesn't appear. */}
      {pillarRecommendations.length > 0 && (
        <Card hover className="mt-5 p-5">
          <Eyebrow>Your Development Focus</Eyebrow>
          <div className="mt-3 grid gap-4">
            {pillarRecommendations.map(({ pillar, resources }) => (
              <div key={pillar}>
                <div className="mb-2 flex items-center gap-2">
                  <PillarChip pillar={pillar} />
                </div>
                <div className="grid gap-2">
                  {resources.map((r) => (
                    <Link
                      key={r.id}
                      href={r.locked ? `/upgrade?need=${r.requiredTier}` : `/library/${r.id}`}
                    >
                      <Card hover className="flex items-center justify-between gap-3 p-3.5">
                        <p className="min-w-0 truncate text-[14px] font-semibold text-white">
                          {r.title}
                        </p>
                        <span className="shrink-0 text-silver-dim">
                          {r.locked ? '🔒' : '→'}
                        </span>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI INSIGHT — one weakness, one drill, one action. No score grid,
          no recommendation list. */}
      <Card hover className="mt-5 p-5">
        <Eyebrow>AI Insight</Eyebrow>
        {aiShotAnalysis ? (
          latestAnalysis ? (
            weakestCategoryLabel ? (
              <>
                <p className="mt-3 text-base font-bold uppercase tracking-[.1em] text-silver-dim">Lowest Score</p>
                <p className="mt-1 text-xl font-semibold text-white">{weakestCategoryLabel}</p>
                {drillRecommendation ? (
                  <>
                    <p className="mt-4 text-base font-bold uppercase tracking-[.1em] text-silver-dim">Recommended Drill</p>
                    <p className="mt-1 text-xl font-semibold text-electric-glow">{drillRecommendation.title}</p>
                    <div className="mt-5">
                      {drillRecommendation.locked ? (
                        <Button href={`/upgrade?need=${drillRecommendation.requiredTier}`} size="sm" variant="ghost">
                          Unlock This Drill
                        </Button>
                      ) : (
                        <Button href={`/library/${drillRecommendation.resourceId}`} size="sm">
                          Start Drill
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-5">
                    <Button href={`/analysis/${latestAnalysis.id}`} size="sm" variant="ghost">
                      View Analysis
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-lg text-silver-dim">Your last shot graded strong across the board.</p>
                <div className="mt-5">
                  <Button href={`/analysis/${latestAnalysis.id}`} size="sm" variant="ghost">View Analysis</Button>
                </div>
              </>
            )
          ) : (
            <>
              <p className="mt-3 text-lg text-silver-dim">
                Upload a clip and get it graded on ten mechanics categories in minutes.
              </p>
              <div className="mt-5">
                <Button href="/analysis/new" size="sm">Upload Shot</Button>
              </div>
            </>
          )
        ) : (
          <>
            <p className="mt-3 text-lg text-silver-dim">
              Graded on ten mechanics categories — included with Standard and Premium.
            </p>
            <div className="mt-5">
              <Button href="/upgrade?need=basic&f=ai_shot_analysis" size="sm" variant="ghost">
                Unlock AI Shot Analysis
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* NUTRITION PICK — exactly one recommendation. */}
      <Card hover className="mt-5 p-5">
        <Eyebrow>Nutrition Pick</Eyebrow>
        {nutritionPlans ? (
          nutritionPick ? (
            <>
              <p className="mt-3 text-xl font-semibold text-white">{nutritionPick.title}</p>
              <p className="mt-1.5 text-base text-silver-dim">
                {nutritionPick.proteinG !== null ? `${nutritionPick.proteinG}g Protein` : ''}
                {nutritionPick.proteinG !== null && nutritionPick.prepMinutes !== null ? ' · ' : ''}
                {nutritionPick.prepMinutes !== null ? `${nutritionPick.prepMinutes} min prep` : ''}
              </p>
              <div className="mt-5">
                <Button href={`/nutrition/${nutritionPick.slug}`} size="sm" variant="ghost">
                  View Recipe
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-lg text-silver-dim">Fuel your next session with a recipe built for players.</p>
              <div className="mt-5">
                <Button href="/nutrition" size="sm" variant="ghost">View Nutrition</Button>
              </div>
            </>
          )
        ) : (
          <>
            <p className="mt-3 text-lg text-silver-dim">
              Recipes and guides for pre-game, recovery and travel — included with Premium.
            </p>
            <div className="mt-5">
              <Button href="/upgrade?need=premium&f=nutrition_plans" size="sm" variant="ghost">
                Unlock Nutrition
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* VIEW MORE — everything secondary (weekly count, recent coach-review
          activity, full library) collapses behind one disclosure instead of
          stacking as its own cards. Native <details>, zero client JS. */}
      {hasMore && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-silver-dim marker:content-none">
            View More
            <span className="text-silver-dim transition-transform group-open:rotate-180">⌄</span>
          </summary>

          <div className="mt-4 grid gap-3">
            {workoutPlans && (
              <Card className="p-4">
                <p className="display text-2xl leading-none">{activity.completedThisWeek}</p>
                <p className="mt-1.5 text-base text-silver-dim">
                  Workout{activity.completedThisWeek === 1 ? '' : 's'} completed this week
                </p>
              </Card>
            )}

            {premium && submissions.length > 0 && (
              <div>
                <h2 className="display text-lg">Recent Activity</h2>
                <div className="mt-3 grid gap-2">
                  {submissions.slice(0, 2).map((s) => (
                    <Link key={s.id} href={`/reviews/${s.id}`}>
                      <Card hover className="flex items-center gap-4 p-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-white">{s.title}</p>
                          <p className="truncate text-sm capitalize text-silver-dim">
                            {s.kind} · {s.status.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm text-silver-dim">{formatDate(s.created_at)}</span>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {premium && mindsetLessons.length > 0 && (
              <Link href="/mindset">
                <Card hover className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-base font-semibold text-white">Mindset Development</p>
                    <p className="mt-0.5 text-sm text-silver-dim">
                      {mindsetDone} of {mindsetLessons.length} lesson{mindsetLessons.length === 1 ? '' : 's'} complete
                    </p>
                  </div>
                  <span className="shrink-0 text-silver-dim">→</span>
                </Card>
              </Link>
            )}

            <Link href="/library">
              <Card hover className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-base font-semibold text-white">Browse the training library</p>
                  <p className="mt-0.5 text-sm text-silver-dim">
                    Lessons and drills across all six pillars, filtered to your tier.
                  </p>
                </div>
                <span className="shrink-0 text-silver-dim">→</span>
              </Card>
            </Link>

            <Link href="/profile">
              <Card hover className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-base font-semibold text-white">Player profile</p>
                  <p className="mt-0.5 text-sm text-silver-dim">
                    View or update level, position, stick flex, pillars and training days.
                  </p>
                </div>
                <span className="shrink-0 text-silver-dim">→</span>
              </Card>
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}
