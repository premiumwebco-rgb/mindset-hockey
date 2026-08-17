import { DEMO_MODE, type Session } from './session';
import { createServerClient } from './supabase/server';
import type { RecipeCategory } from './nutrition';

/* ==========================================================================
   Server-side data access.

   Every read goes through the request-scoped Supabase client, so RLS applies.
   In demo mode these return representative fixtures so the whole UI can be
   walked through without a backend.
   ========================================================================== */

/* ------------------------------------------------------------------ metrics */

export interface MetricRow {
  kind: string;
  value: number;
  unit: string | null;
  recorded_at: string;
  source: string | null;
}

export async function getMetrics(session: Session): Promise<MetricRow[]> {
  if (DEMO_MODE) {
    const days = [42, 35, 28, 21, 14, 7, 0];
    return days.flatMap((d, i) => [
      {
        kind: 'analysis_score',
        value: 58 + i * 2.2,
        unit: 'pts',
        recorded_at: new Date(Date.now() - d * 864e5).toISOString().slice(0, 10),
        source: 'ai_analysis',
      },
      {
        kind: 'shot_mph',
        value: 52 + i * 0.9,
        unit: 'mph',
        recorded_at: new Date(Date.now() - d * 864e5).toISOString().slice(0, 10),
        source: 'manual',
      },
    ]);
  }
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('metrics')
    .select('kind, value, unit, recorded_at, source')
    .eq('profile_id', session.userId)
    .order('recorded_at', { ascending: true })
    .limit(500);
  return (data as MetricRow[]) ?? [];
}

/* ---------------------------------------------------------------- workouts */

export interface WorkoutPlanRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  phase: string;
  focus: string;
  weeks: number;
}

export async function getWorkoutPlans(): Promise<WorkoutPlanRow[]> {
  if (DEMO_MODE) {
    return [
      { id: 'w1', slug: 'off-season-power', title: 'Off-Season Power Block', description: 'Eight weeks building the base that shows up as shot velocity in September.', phase: 'off_season', focus: 'power', weeks: 8 },
      { id: 'w2', slug: 'in-season-maintain', title: 'In-Season Maintenance', description: 'Two short sessions a week that keep strength without stealing legs from games.', phase: 'in_season', focus: 'strength', weeks: 12 },
      { id: 'w3', slug: 'speed-and-edges', title: 'Speed & Edge Work', description: 'Acceleration, change of direction and the off-ice work that makes edges sharper.', phase: 'off_season', focus: 'speed', weeks: 6 },
      { id: 'w4', slug: 'mobility-recovery', title: 'Mobility & Recovery', description: 'Hips, ankles and thoracic spine — the three that limit most young shooters.', phase: 'in_season', focus: 'mobility', weeks: 4 },
    ];
  }
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workout_plans')
    .select('id, slug, title, description, phase, focus, weeks')
    .eq('is_published', true)
    // Situational routines (see below) live in this same table so they share
    // its RLS and admin tooling, but they are a different content type —
    // single-session, not periodised — and must not show up mixed into this
    // multi-week list.
    .neq('phase', 'routine')
    .order('sort_order');
  return (data as WorkoutPlanRow[]) ?? [];
}

/* --------------------------------------------------------- workout routines
   "What do I do before a game / after practice / on a travel day" — a single
   structured session for a situation, as opposed to the multi-week periodised
   plans above.

   REUSES the exact same tables as workout_plans/workout_sessions above: no
   migration, no new RLS. A routine is one workout_plans row with
   phase = 'routine' (weeks is meaningless for these and left at 1) and
   exactly one linked workout_sessions row. That session's `blocks` jsonb
   column — previously unused, with no reader anywhere in the codebase to
   conflict with — holds the routine's structure:

     { difficulty, whenToUse, coachTip, sections: [{ name, items: [...] }] }

   rather than the flat exercise-list shape its original column comment
   sketched, because nothing had ever been built against that shape yet.
   ------------------------------------------------------------------------ */

export const ROUTINE_OCCASIONS = [
  'pre-game',
  'pre-practice',
  'post-practice-recovery',
  'game-day',
  'strength-day',
  'speed-agility',
  'recovery-day',
  'off-ice-shooting',
  'travel-hotel',
  'quick-15',
] as const;

export type RoutineOccasion = (typeof ROUTINE_OCCASIONS)[number];

export const OCCASION_LABEL: Record<RoutineOccasion, string> = {
  'pre-game': 'Pre-Game',
  'pre-practice': 'Pre-Practice',
  'post-practice-recovery': 'Post-Practice Recovery',
  'game-day': 'Game Day',
  'strength-day': 'Strength Day',
  'speed-agility': 'Speed & Agility',
  'recovery-day': 'Recovery Day',
  'off-ice-shooting': 'Off-Ice Shooting',
  'travel-hotel': 'Travel / Hotel',
  'quick-15': 'Quick 15-Minute',
};

export function isRoutineOccasion(v: unknown): v is RoutineOccasion {
  return typeof v === 'string' && (ROUTINE_OCCASIONS as readonly string[]).includes(v);
}

export const ROUTINE_DIFFICULTIES = ['easy', 'moderate', 'advanced'] as const;
export type RoutineDifficulty = (typeof ROUTINE_DIFFICULTIES)[number];

export interface RoutineExercise {
  name: string;
  duration?: string;
  sets?: number;
  reps?: string;
  rest?: string;
  instructions: string;
}

export interface RoutineSection {
  name: string;
  items: RoutineExercise[];
}

interface RoutineBlocksShape {
  difficulty?: string;
  whenToUse?: string;
  coachTip?: string;
  equipment?: string[];
  sections?: RoutineSection[];
}

function parseRoutineBlocks(raw: unknown): RoutineBlocksShape {
  if (!raw || typeof raw !== 'object') return {};
  return raw as RoutineBlocksShape;
}

export interface WorkoutRoutineCard {
  id: string;
  slug: string;
  title: string;
  purpose: string | null;
  occasion: string;
  difficulty: string | null;
  durationMin: number | null;
  equipment: string[];
  /** workout_sessions.id — the row workout_completions.session_id points at. */
  sessionId: string | null;
}

export interface WorkoutRoutineDetail extends WorkoutRoutineCard {
  whenToUse: string | null;
  coachTip: string | null;
  sections: RoutineSection[];
}

interface RoutinePlanRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  focus: string;
  workout_sessions:
    | { id: string; blocks: unknown; duration_min: number | null }[]
    | { id: string; blocks: unknown; duration_min: number | null }
    | null;
}

function firstSession(row: RoutinePlanRow) {
  return Array.isArray(row.workout_sessions) ? row.workout_sessions[0] : row.workout_sessions;
}

function toRoutineCard(row: RoutinePlanRow): WorkoutRoutineCard {
  const session = firstSession(row);
  const blocks = parseRoutineBlocks(session?.blocks);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    purpose: row.description,
    occasion: row.focus,
    difficulty: blocks.difficulty ?? null,
    durationMin: session?.duration_min ?? null,
    equipment: blocks.equipment ?? [],
    sessionId: session?.id ?? null,
  };
}

const ROUTINE_SELECT = 'id, slug, title, description, focus, workout_sessions(id, blocks, duration_min)';

/** Occasion -> routine slug, for a simple "what should I do today?" picker.
 *  Deliberately a plain lookup table, not a recommendation engine. */
export const TODAY_OCCASION_OPTIONS: { key: string; label: string; occasion: RoutineOccasion }[] = [
  { key: 'game', label: 'Game', occasion: 'pre-game' },
  { key: 'practice', label: 'Practice', occasion: 'pre-practice' },
  { key: 'gym', label: 'Gym', occasion: 'strength-day' },
  { key: 'speed', label: 'Speed Training', occasion: 'speed-agility' },
  { key: 'recovery', label: 'Recovery', occasion: 'recovery-day' },
  { key: 'travel', label: 'Travel', occasion: 'travel-hotel' },
  { key: 'off', label: 'Off Day', occasion: 'quick-15' },
  { key: 'tournament', label: 'Tournament', occasion: 'game-day' },
];

/** Session IDs (from workout_completions) the caller has already marked done.
 *  Small dataset — one row per routine ever completed — so no pagination. */
export async function getCompletedSessionIds(session: Session): Promise<Set<string>> {
  if (DEMO_MODE) return new Set();
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workout_completions')
    .select('session_id')
    .eq('profile_id', session.userId);
  return new Set((data ?? []).map((r) => r.session_id as string));
}

/** Every published routine, in library order. Small, fixed-size content — filtering happens in JS, same as /drills. */
export async function getWorkoutRoutines(): Promise<WorkoutRoutineCard[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workout_plans')
    .select(ROUTINE_SELECT)
    .eq('is_published', true)
    .eq('phase', 'routine')
    .order('sort_order');
  return ((data as unknown as RoutinePlanRow[]) ?? []).map(toRoutineCard);
}

/** One routine's full structure. RLS-scoped — a non-entitled or unpublished slug simply returns null, same 404 pattern as everywhere else. */
export async function getWorkoutRoutineBySlug(slug: string): Promise<WorkoutRoutineDetail | null> {
  if (DEMO_MODE) return null;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workout_plans')
    .select(ROUTINE_SELECT)
    .eq('is_published', true)
    .eq('phase', 'routine')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as RoutinePlanRow;
  const session = firstSession(row);
  const blocks = parseRoutineBlocks(session?.blocks);
  return {
    ...toRoutineCard(row),
    whenToUse: blocks.whenToUse ?? null,
    coachTip: blocks.coachTip ?? null,
    sections: blocks.sections ?? [],
  };
}

/** Occasion -> nutrition category, for a simple "pairs well with"/"recommended
 *  fuel" surface shared by the routine detail page and the dashboard. A
 *  plain lookup table, not a recommendation engine. */
export const OCCASION_NUTRITION_CATEGORY: Partial<Record<RoutineOccasion, RecipeCategory>> = {
  'pre-game': 'pre_game',
  'pre-practice': 'pre_practice',
  'post-practice-recovery': 'post_practice',
  'game-day': 'pre_game',
  'strength-day': 'pre_workout',
  'speed-agility': 'pre_workout',
  'recovery-day': 'recovery',
  'off-ice-shooting': 'pre_workout',
  'travel-hotel': 'road',
  'quick-15': 'post_workout',
};

export interface WorkoutActivityStats {
  /** Consecutive calendar days (ending today or yesterday) with at least one completion. */
  streakDays: number;
  /** Completions in the trailing 7 days — the dashboard's single "Quick Progress" metric. */
  completedThisWeek: number;
}

/** Read-only rollup over the existing workout_completions table — no new
 *  table, no new tracking, just arithmetic over rows the completion-toggle
 *  feature already writes. RLS scopes this to the caller's own rows. */
export async function getWorkoutActivityStats(session: Session): Promise<WorkoutActivityStats> {
  if (DEMO_MODE) return { streakDays: 0, completedThisWeek: 0 };
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workout_completions')
    .select('completed_at')
    .eq('profile_id', session.userId)
    .order('completed_at', { ascending: false });

  const rows = (data ?? []) as { completed_at: string }[];
  if (rows.length === 0) return { streakDays: 0, completedThisWeek: 0 };

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Set(rows.map((r) => dayKey(new Date(r.completed_at))));

  // Streak counts consecutive calendar days ending today or yesterday — a
  // day that simply hasn't happened yet today doesn't zero out yesterday's streak.
  let streakDays = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  const completedThisWeek = rows.filter((r) => new Date(r.completed_at).getTime() >= weekAgo).length;

  return { streakDays, completedThisWeek };
}

/* --------------------------------------------------------------- nutrition */

export interface MealPlanRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  goal: string;
  calories: number | null;
  protein_g: number | null;
}

export async function getMealPlans(): Promise<MealPlanRow[]> {
  if (DEMO_MODE) {
    return [
      { id: 'm1', slug: 'game-day', title: 'Game Day Fuelling', description: 'What to eat and when, from breakfast through the post-game window.', goal: 'performance', calories: 3200, protein_g: 150 },
      { id: 'm2', slug: 'lean-mass', title: 'Adding Lean Mass', description: 'For the player who needs size without losing a step.', goal: 'gain', calories: 3800, protein_g: 180 },
      { id: 'm3', slug: 'recovery', title: 'Recovery Nutrition', description: 'Back-to-back games, tournaments and the 30-minute window that matters.', goal: 'recovery', calories: 3000, protein_g: 160 },
    ];
  }
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('meal_plans')
    .select('id, slug, title, description, goal, calories, protein_g')
    .eq('is_published', true);
  return (data as MealPlanRow[]) ?? [];
}

/* ----------------------------------------------------------------- mindset */

export interface MindsetLessonRow {
  id: string;
  slug: string;
  week: number;
  topic: string;
  title: string;
  summary: string | null;
  completed?: boolean;
}

const DEMO_MINDSET: MindsetLessonRow[] = [
  { id: 'l1', slug: 'confidence-evidence', week: 1, topic: 'confidence', title: 'Confidence Follows Evidence', summary: 'Why "just be confident" fails, and what to build instead.', completed: true },
  { id: 'l2', slug: 'twenty-second-reset', week: 2, topic: 'mistakes', title: 'The 20-Second Reset', summary: 'What to do between the turnover and the next puck drop.', completed: true },
  { id: 'l3', slug: 'pre-game-routine', week: 3, topic: 'preparation', title: 'Building a Pre-Game Routine', summary: 'A repeatable sequence so you arrive ready instead of hoping.', completed: false },
  { id: 'l4', slug: 'mental-toughness', week: 4, topic: 'toughness', title: 'Finishing What You Start', summary: 'Standards over motivation on the days it stops being fun.', completed: false },
  { id: 'l5', slug: 'accountability', week: 5, topic: 'accountability', title: 'Owning the Tape', summary: 'How to watch your own bad shifts without spiralling.', completed: false },
  { id: 'l6', slug: 'pressure', week: 6, topic: 'pressure', title: 'Performing Under Pressure', summary: 'Tryouts, showcases and overtime — narrowing to the next play.', completed: false },
  { id: 'l7', slug: 'goal-setting', week: 7, topic: 'goals', title: 'Process Over Outcome', summary: 'Goals you control instead of goals you can only hope for.', completed: false },
  { id: 'l8', slug: 'leadership', week: 8, topic: 'leadership', title: 'Earning the Letter', summary: 'Becoming the player a coach uses when it matters.', completed: false },
];

export async function getMindsetLessons(session: Session): Promise<MindsetLessonRow[]> {
  if (DEMO_MODE) return DEMO_MINDSET;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('mindset_lessons')
    .select('id, slug, week, topic, title, summary')
    .eq('is_published', true)
    .order('sort_order');
  const lessons = (data as MindsetLessonRow[]) ?? [];

  const { data: progress } = await supabase
    .from('mindset_progress')
    .select('lesson_id, completed_at')
    .eq('profile_id', session.userId);

  const done = new Set((progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id));
  return lessons.map((l) => ({ ...l, completed: done.has(l.id) }));
}

/* -------------------------------------------------------- video submissions */

export interface SubmissionRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_at: string;
  notes: string | null;
}

export async function getSubmissions(session: Session): Promise<SubmissionRow[]> {
  if (DEMO_MODE) {
    return [
      { id: 's1', title: 'Saturday game — 2nd period shifts', kind: 'game', status: 'reviewed', created_at: new Date(Date.now() - 6 * 864e5).toISOString(), notes: 'Felt slow on the forecheck.' },
      { id: 's2', title: 'Practice — shooting reps', kind: 'practice', status: 'in_review', created_at: new Date(Date.now() - 1 * 864e5).toISOString(), notes: null },
    ];
  }
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('video_submissions')
    .select('id, title, kind, status, created_at, notes')
    .eq('profile_id', session.userId)
    .order('created_at', { ascending: false });
  return (data as SubmissionRow[]) ?? [];
}
