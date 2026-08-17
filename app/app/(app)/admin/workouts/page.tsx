import { requireAdmin } from '@/lib/session';
import { Eyebrow } from '@/components/ui';
import WorkoutManager from './WorkoutManager';

export const metadata = { title: 'Workout Content — Admin — Mindset Hockey' };

export default async function WorkoutAdminPage() {
  await requireAdmin();
  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Workout Content</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-silver-dim">
        Create and manage the workout routines players see on the dashboard and the Workouts
        library — no code changes needed.
      </p>
      <div className="mt-8">
        <WorkoutManager />
      </div>
    </div>
  );
}
