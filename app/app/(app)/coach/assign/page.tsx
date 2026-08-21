import { requireStaff } from '@/lib/session';
import {
  getAssignablePlayers,
  getAssignableMindsetLessons,
  getAssignableWorkoutSessions,
  getCoachAssignments,
} from '@/lib/assignments';
import { Card, PageHeading, EmptyState } from '@/components/ui';
import AssignmentForm from './AssignmentForm';
import DismissButton from './DismissButton';

export const metadata = { title: 'Assign — Coach Console' };

/** Reads real, live assignment/completion data — must never be cached. */
export const dynamic = 'force-dynamic';

const CONTENT_TYPE_LABEL: Record<string, string> = {
  mindset_lesson: 'Mindset Lesson',
  workout_session: 'Workout',
  video_review: 'Video Review',
  ai_shot_analysis: 'AI Shot Analysis',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function CoachAssignPage() {
  await requireStaff();

  const [players, mindsetLessons, workoutSessions, assignments] = await Promise.all([
    getAssignablePlayers(),
    getAssignableMindsetLessons(),
    getAssignableWorkoutSessions(),
    getCoachAssignments(),
  ]);

  const active = assignments.filter((a) => a.status === 'active');
  const dismissed = assignments.filter((a) => a.status === 'dismissed');

  return (
    <div>
      <PageHeading
        eyebrow="Coach console"
        title="Assign to a Player"
        sub="Point a player at a mindset lesson, workout, video review, or AI shot analysis. Completion is tracked automatically from what they already do — nothing here is a second progress system."
      />

      <Card className="mt-7 p-6">
        <AssignmentForm players={players} mindsetLessons={mindsetLessons} workoutSessions={workoutSessions} />
      </Card>

      <h2 className="display mt-9 text-[20px]">Active Assignments</h2>
      {active.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No active assignments yet"
            body="Assignments you create above will show up here, along with whether the player has completed them."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {active.map((a) => (
            <Card key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
                  {CONTENT_TYPE_LABEL[a.contentType] ?? a.contentType}
                </p>
                <p className="mt-1 truncate text-[15px] font-semibold text-white">
                  {a.playerName} — {a.contentTitle}
                </p>
                <p className="mt-1 text-[13px] text-silver-dim">
                  {a.dueAt ? `Due ${formatDate(a.dueAt)}` : 'No due date'}
                  {a.note ? ` · "${a.note}"` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={
                    'rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ' +
                    (a.completed
                      ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
                      : 'border-white/20 bg-white/[.05] text-silver-dim')
                  }
                >
                  {a.completed ? 'Completed' : 'Active'}
                </span>
                <DismissButton assignmentId={a.id} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-silver-dim marker:content-none">
            Dismissed ({dismissed.length})
            <span className="text-silver-dim transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-4 grid gap-2">
            {dismissed.map((a) => (
              <Card key={a.id} className="p-3.5 opacity-60">
                <p className="text-[13.5px] text-silver-dim">
                  {a.playerName} — {CONTENT_TYPE_LABEL[a.contentType] ?? a.contentType}: {a.contentTitle}
                </p>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
