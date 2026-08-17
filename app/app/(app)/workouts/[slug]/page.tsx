import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireFeature } from '@/lib/session';
import { getWorkoutRoutineBySlug, OCCASION_LABEL, isRoutineOccasion } from '@/lib/data';
import { Card, Eyebrow } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const routine = await getWorkoutRoutineBySlug(slug).catch(() => null);
  return { title: routine ? `${routine.title} — Mindset Hockey` : 'Routine — Mindset Hockey' };
}

export default async function WorkoutRoutinePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireFeature('workout_plans');
  const { slug } = await params;

  // RLS scopes this to published, entitled rows — a locked or unpublished
  // slug returns null and 404s, the same pattern every other detail page here uses.
  const routine = await getWorkoutRoutineBySlug(slug);
  if (!routine) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{isRoutineOccasion(routine.occasion) ? OCCASION_LABEL[routine.occasion] : routine.occasion}</Eyebrow>
          <h1 className="display text-[clamp(26px,4.5vw,40px)]">{routine.title}</h1>
          {routine.purpose && <p className="mt-2 max-w-[62ch] text-[15px] text-silver">{routine.purpose}</p>}
        </div>
        <Link
          href="/workouts"
          className="-m-2 inline-block p-2 text-[14px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
        >
          All routines
        </Link>
      </div>

      {/* --------------------------------------------------- quick facts --- */}
      <Card className="mt-6 p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">Duration</p>
            <p className="mt-1 text-[16px] font-semibold text-white">
              {routine.durationMin !== null ? `${routine.durationMin} min` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">Difficulty</p>
            <p className="mt-1 text-[16px] font-semibold capitalize text-white">{routine.difficulty ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">When to use</p>
            <p className="mt-1 text-[14.5px] text-silver">{routine.whenToUse ?? '—'}</p>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------- sections --- */}
      <div className="mt-6 grid gap-5">
        {routine.sections.map((section) => (
          <Card key={section.name} className="p-6">
            <h2 className="text-[13px] font-bold uppercase tracking-[.16em] text-electric-glow">{section.name}</h2>
            <div className="mt-4 grid gap-4">
              {section.items.map((item, i) => (
                <div key={i} className="border-t border-white/[.06] pt-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[15.5px] font-semibold text-white">{item.name}</h3>
                    <span className="flex flex-wrap gap-x-3 text-[12.5px] font-semibold text-silver-dim">
                      {item.duration && <span>{item.duration}</span>}
                      {item.sets !== undefined && item.reps && (
                        <span>
                          {item.sets} × {item.reps}
                        </span>
                      )}
                      {item.rest && <span>Rest {item.rest}</span>}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-silver-dim">{item.instructions}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {routine.coachTip && (
        <Card className="mt-6 p-6">
          <h2 className="display text-[17px]">Coach tip</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-silver">{routine.coachTip}</p>
        </Card>
      )}
    </div>
  );
}
