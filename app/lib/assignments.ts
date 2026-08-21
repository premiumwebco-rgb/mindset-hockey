import { DEMO_MODE, type Session } from './session';
import { createServerClient } from './supabase/server';

/* ==========================================================================
   COACH ASSIGNMENTS — Phase A / MVP

   A coach points existing content at a player. This file never creates a
   second completion system: mindset_lesson / workout_session / video_review
   / ai_shot_analysis completion is always derived, at read time, from the
   same tables the rest of the app already uses —
     mindset_progress, workout_completions, video_submissions.status,
     shot_analyses.status
   — never from assignments.completed_at (that column exists in the schema
   for a future content type with no completion source of its own; nothing
   in this file reads or writes it).

   Every read here follows the same shape already used by
   getPillarRecommendations(): one bounded query for the assignment rows,
   then at most one additional batched query PER content type actually
   present in the result set — never one query per assignment.
   ========================================================================== */

export const ASSIGNMENT_CONTENT_TYPES = [
  'mindset_lesson',
  'workout_session',
  'video_review',
  'ai_shot_analysis',
] as const;

export type AssignmentContentType = (typeof ASSIGNMENT_CONTENT_TYPES)[number];

export function isAssignmentContentType(v: unknown): v is AssignmentContentType {
  return typeof v === 'string' && (ASSIGNMENT_CONTENT_TYPES as readonly string[]).includes(v);
}

/** mindset_lesson / workout_session point at one row; video_review /
 *  ai_shot_analysis assign the activity itself, not a specific row — the
 *  player hasn't created that row yet when the assignment is made. */
export function contentTypeRequiresContentId(t: AssignmentContentType): boolean {
  return t === 'mindset_lesson' || t === 'workout_session';
}

const COMPLETE_SUBMISSION_STATUSES = new Set(['reviewed']);
const COMPLETE_ANALYSIS_STATUSES = new Set(['analyzed', 'in_review', 'reviewed']);

/* --------------------------------------------------------------- player side */

export interface PlayerAssignment {
  id: string;
  contentType: AssignmentContentType;
  title: string;
  href: string;
  dueAt: string | null;
  note: string | null;
  createdAt: string;
  completed: boolean;
  overdue: boolean;
}

interface RawAssignmentRow {
  id: string;
  content_type: AssignmentContentType;
  content_id: string | null;
  due_at: string | null;
  note: string | null;
  created_at: string;
}

function firstJoined<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * The player's own active assignments, each resolved to a real title/link
 * and a completion boolean derived from existing progress tables. RLS
 * (assignments_own_read) scopes the base query to the caller's own rows —
 * this function does not additionally filter by profile_id itself, the same
 * trust-RLS pattern used by getSubmissions().
 */
export async function getActiveAssignmentsForPlayer(session: Session): Promise<PlayerAssignment[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('assignments')
    .select('id, content_type, content_id, due_at, note, created_at')
    .eq('profile_id', session.userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as RawAssignmentRow[];
  if (rows.length === 0) return [];

  const mindsetIds = [...new Set(rows.filter((r) => r.content_type === 'mindset_lesson' && r.content_id).map((r) => r.content_id as string))];
  const workoutSessionIds = [...new Set(rows.filter((r) => r.content_type === 'workout_session' && r.content_id).map((r) => r.content_id as string))];
  const hasVideoReview = rows.some((r) => r.content_type === 'video_review');
  const hasAiAnalysis = rows.some((r) => r.content_type === 'ai_shot_analysis');

  const [mindsetLessons, workoutSessions, mindsetDone, workoutDone, submissions, analyses] = await Promise.all([
    mindsetIds.length > 0
      ? supabase.from('mindset_lessons').select('id, slug, title').in('id', mindsetIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string }[] }),
    workoutSessionIds.length > 0
      ? supabase.from('workout_sessions').select('id, title, workout_plans(slug)').in('id', workoutSessionIds)
      : Promise.resolve({ data: [] as { id: string; title: string; workout_plans: { slug: string } | { slug: string }[] | null }[] }),
    mindsetIds.length > 0
      ? supabase.from('mindset_progress').select('lesson_id, completed_at').eq('profile_id', session.userId).in('lesson_id', mindsetIds)
      : Promise.resolve({ data: [] as { lesson_id: string; completed_at: string | null }[] }),
    workoutSessionIds.length > 0
      ? supabase.from('workout_completions').select('session_id').eq('profile_id', session.userId).in('session_id', workoutSessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    hasVideoReview
      ? supabase.from('video_submissions').select('status, created_at').eq('profile_id', session.userId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { status: string; created_at: string }[] }),
    hasAiAnalysis
      ? supabase.from('shot_analyses').select('status, created_at').eq('profile_id', session.userId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { status: string; created_at: string }[] }),
  ]);

  const mindsetTitleById = new Map((mindsetLessons.data ?? []).map((l) => [l.id, l]));
  const mindsetDoneIds = new Set((mindsetDone.data ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id));

  const workoutTitleById = new Map(
    (workoutSessions.data ?? []).map((s) => {
      const plan = firstJoined(s.workout_plans);
      return [s.id, { title: s.title, slug: plan?.slug ?? null }] as const;
    }),
  );
  const workoutDoneIds = new Set((workoutDone.data ?? []).map((c) => c.session_id));

  const submissionRows = submissions.data ?? [];
  const analysisRows = analyses.data ?? [];

  const now = Date.now();
  const result: PlayerAssignment[] = [];

  for (const row of rows) {
    let title: string | null = null;
    let href: string | null = null;
    let completed = false;

    if (row.content_type === 'mindset_lesson' && row.content_id) {
      const lesson = mindsetTitleById.get(row.content_id);
      if (!lesson) continue; // content since deleted/unpublished — skip rather than show a broken card
      title = lesson.title;
      href = `/mindset/${lesson.slug}`;
      completed = mindsetDoneIds.has(row.content_id);
    } else if (row.content_type === 'workout_session' && row.content_id) {
      const workout = workoutTitleById.get(row.content_id);
      if (!workout || !workout.slug) continue;
      title = workout.title;
      href = `/workouts/${workout.slug}`;
      completed = workoutDoneIds.has(row.content_id);
    } else if (row.content_type === 'video_review') {
      title = 'Submit game or practice footage for review';
      completed = submissionRows.some(
        (s) => COMPLETE_SUBMISSION_STATUSES.has(s.status) && new Date(s.created_at).getTime() >= new Date(row.created_at).getTime(),
      );
      href = completed ? '/reviews' : '/reviews/new';
    } else if (row.content_type === 'ai_shot_analysis') {
      title = 'Upload a shot for AI analysis';
      completed = analysisRows.some(
        (a) => COMPLETE_ANALYSIS_STATUSES.has(a.status) && new Date(a.created_at).getTime() >= new Date(row.created_at).getTime(),
      );
      href = completed ? '/analysis' : '/analysis/new';
    }

    if (!title || !href) continue;

    result.push({
      id: row.id,
      contentType: row.content_type,
      title,
      href,
      dueAt: row.due_at,
      note: row.note,
      createdAt: row.created_at,
      completed,
      overdue: !completed && !!row.due_at && new Date(row.due_at).getTime() < now,
    });
  }

  return result;
}

/* ---------------------------------------------------------------- coach side */

export interface AssignablePlayer {
  profileId: string;
  name: string;
}

/** Every player, for the coach's assignment-target picker. RLS
 *  ("own players" — profile_id = auth.uid() or is_staff()) already lets any
 *  coach/admin read every row here, same as the video-review queue. */
export async function getAssignablePlayers(): Promise<AssignablePlayer[]> {
  if (DEMO_MODE) return [{ profileId: 'demo-user', name: 'Demo Player' }];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('players')
    .select('profile_id, first_name, last_name')
    .order('first_name');
  return ((data ?? []) as { profile_id: string; first_name: string; last_name: string | null }[]).map((p) => ({
    profileId: p.profile_id,
    name: p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name,
  }));
}

export interface AssignableMindsetLesson {
  id: string;
  title: string;
  week: number;
}

/** Published mindset lessons only — an unpublished lesson can't be assigned
 *  any more than it can be recommended. */
export async function getAssignableMindsetLessons(): Promise<AssignableMindsetLesson[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('mindset_lessons')
    .select('id, title, week')
    .eq('is_published', true)
    .order('week');
  return (data as AssignableMindsetLesson[]) ?? [];
}

export interface AssignableWorkoutSession {
  id: string;
  title: string;
  occasion: string;
}

/**
 * Assignable workout content, scoped to published routines (the same
 * single-session "what do I do right now" content getWorkoutRoutines()
 * already exposes on /workouts and the Development Plan) rather than the
 * multi-week periodized programs. Keeps the coach's picker to one simple,
 * already-published-and-tiered list instead of a second workout browser.
 */
export async function getAssignableWorkoutSessions(): Promise<AssignableWorkoutSession[]> {
  const { getWorkoutRoutines } = await import('./data');
  const routines = await getWorkoutRoutines();
  return routines
    .filter((r) => r.sessionId)
    .map((r) => ({ id: r.sessionId as string, title: r.title, occasion: r.occasion }));
}

export interface CoachAssignmentRow {
  id: string;
  playerName: string;
  contentType: AssignmentContentType;
  contentTitle: string;
  dueAt: string | null;
  note: string | null;
  status: 'active' | 'dismissed';
  completed: boolean;
  createdAt: string;
}

interface RawCoachAssignmentRow extends RawAssignmentRow {
  profile_id: string;
  status: 'active' | 'dismissed';
}

/**
 * Every assignment a coach/admin has made, most recent first, with a real
 * content title and a derived completion boolean — same batching principle
 * as the player-side function, just grouped across however many distinct
 * players appear in the (bounded, limited) result set rather than one.
 * Capped at 200 rows — an operational list for the coach console, not an
 * unbounded export.
 */
export async function getCoachAssignments(): Promise<CoachAssignmentRow[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('assignments')
    .select('id, profile_id, content_type, content_id, due_at, note, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as RawCoachAssignmentRow[];
  if (rows.length === 0) return [];

  const mindsetIds = [...new Set(rows.filter((r) => r.content_type === 'mindset_lesson' && r.content_id).map((r) => r.content_id as string))];
  const workoutSessionIds = [...new Set(rows.filter((r) => r.content_type === 'workout_session' && r.content_id).map((r) => r.content_id as string))];
  const videoReviewProfileIds = [...new Set(rows.filter((r) => r.content_type === 'video_review').map((r) => r.profile_id))];
  const analysisProfileIds = [...new Set(rows.filter((r) => r.content_type === 'ai_shot_analysis').map((r) => r.profile_id))];
  // assignments.profile_id and players.profile_id are sibling foreign keys to
  // profiles(id), not a direct relationship to each other — there is no FK
  // PostgREST can use to embed `players` on this select, so player names are
  // resolved with their own batched query below instead of a nested select.
  const allProfileIds = [...new Set(rows.map((r) => r.profile_id))];

  const [mindsetLessons, workoutSessions, mindsetProgress, workoutCompletions, submissions, analyses, players] = await Promise.all([
    mindsetIds.length > 0
      ? supabase.from('mindset_lessons').select('id, title').in('id', mindsetIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    workoutSessionIds.length > 0
      ? supabase.from('workout_sessions').select('id, title').in('id', workoutSessionIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    mindsetIds.length > 0
      ? supabase.from('mindset_progress').select('profile_id, lesson_id, completed_at').in('lesson_id', mindsetIds)
      : Promise.resolve({ data: [] as { profile_id: string; lesson_id: string; completed_at: string | null }[] }),
    workoutSessionIds.length > 0
      ? supabase.from('workout_completions').select('profile_id, session_id').in('session_id', workoutSessionIds)
      : Promise.resolve({ data: [] as { profile_id: string; session_id: string }[] }),
    videoReviewProfileIds.length > 0
      ? supabase.from('video_submissions').select('profile_id, status, created_at').in('profile_id', videoReviewProfileIds)
      : Promise.resolve({ data: [] as { profile_id: string; status: string; created_at: string }[] }),
    analysisProfileIds.length > 0
      ? supabase.from('shot_analyses').select('profile_id, status, created_at').in('profile_id', analysisProfileIds)
      : Promise.resolve({ data: [] as { profile_id: string; status: string; created_at: string }[] }),
    supabase.from('players').select('profile_id, first_name, last_name').in('profile_id', allProfileIds),
  ]);

  const mindsetTitleById = new Map((mindsetLessons.data ?? []).map((l) => [l.id, l.title]));
  const workoutTitleById = new Map((workoutSessions.data ?? []).map((s) => [s.id, s.title]));
  const mindsetDonePairs = new Set(
    (mindsetProgress.data ?? []).filter((p) => p.completed_at).map((p) => `${p.profile_id}:${p.lesson_id}`),
  );
  const workoutDonePairs = new Set((workoutCompletions.data ?? []).map((c) => `${c.profile_id}:${c.session_id}`));
  const submissionsByProfile = new Map<string, { status: string; created_at: string }[]>();
  for (const s of submissions.data ?? []) {
    const list = submissionsByProfile.get(s.profile_id) ?? [];
    list.push(s);
    submissionsByProfile.set(s.profile_id, list);
  }
  const analysesByProfile = new Map<string, { status: string; created_at: string }[]>();
  for (const a of analyses.data ?? []) {
    const list = analysesByProfile.get(a.profile_id) ?? [];
    list.push(a);
    analysesByProfile.set(a.profile_id, list);
  }

  const playerNameByProfile = new Map(
    ((players.data ?? []) as { profile_id: string; first_name: string; last_name: string | null }[]).map((p) => [
      p.profile_id,
      p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name,
    ]),
  );

  const result: CoachAssignmentRow[] = [];
  for (const row of rows) {
    const playerName = playerNameByProfile.get(row.profile_id) ?? 'Unknown player';

    let contentTitle = '';
    let completed = false;

    if (row.content_type === 'mindset_lesson' && row.content_id) {
      contentTitle = mindsetTitleById.get(row.content_id) ?? 'Mindset lesson';
      completed = mindsetDonePairs.has(`${row.profile_id}:${row.content_id}`);
    } else if (row.content_type === 'workout_session' && row.content_id) {
      contentTitle = workoutTitleById.get(row.content_id) ?? 'Workout';
      completed = workoutDonePairs.has(`${row.profile_id}:${row.content_id}`);
    } else if (row.content_type === 'video_review') {
      contentTitle = 'Video review submission';
      completed = (submissionsByProfile.get(row.profile_id) ?? []).some(
        (s) => COMPLETE_SUBMISSION_STATUSES.has(s.status) && new Date(s.created_at).getTime() >= new Date(row.created_at).getTime(),
      );
    } else if (row.content_type === 'ai_shot_analysis') {
      contentTitle = 'AI Shot Analysis';
      completed = (analysesByProfile.get(row.profile_id) ?? []).some(
        (a) => COMPLETE_ANALYSIS_STATUSES.has(a.status) && new Date(a.created_at).getTime() >= new Date(row.created_at).getTime(),
      );
    }

    result.push({
      id: row.id,
      playerName,
      contentType: row.content_type,
      contentTitle,
      dueAt: row.due_at,
      note: row.note,
      status: row.status,
      completed,
      createdAt: row.created_at,
    });
  }

  return result;
}
