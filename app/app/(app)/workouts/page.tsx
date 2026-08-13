import { requireFeature } from '@/lib/session';
import { getWorkoutPlans } from '@/lib/data';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Workout Plans — Mindset Hockey' };

const PHASE_LABEL: Record<string, string> = {
  in_season: 'In-season',
  off_season: 'Off-season',
  playoffs: 'Playoffs',
};

export default async function WorkoutsPage() {
  await requireFeature('workout_plans');
  const plans = await getWorkoutPlans();

  return (
    <div>
      <Eyebrow>Strength &amp; Conditioning</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Workout plans</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Built for hockey players, periodised around your season. Every session logs to your
        progress dashboard so you can see the work adding up.
      </p>

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No plans published yet" body="Your coach is building these now — check back shortly." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.id} hover className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-electric-glow">
                  {PHASE_LABEL[p.phase] ?? p.phase}
                </span>
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">
                  {p.focus}
                </span>
              </div>
              <h3 className="display mt-4 text-[21px]">{p.title}</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">{p.description}</p>
              <p className="mt-4 text-[12.5px] text-silver-dim">{p.weeks} weeks</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
