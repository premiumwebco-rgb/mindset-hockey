import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { requireFeature, canUse } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getWorkoutRoutineBySlug,
  getCompletedSessionIds,
  OCCASION_LABEL,
  OCCASION_NUTRITION_CATEGORY,
  isRoutineOccasion,
} from '@/lib/data';
import { getCookbook, CATEGORY_LABEL, type RecipeCategory } from '@/lib/nutrition';
import { Card, Eyebrow, Button } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const routine = await getWorkoutRoutineBySlug(slug).catch(() => null);
  return { title: routine ? `${routine.title} — Mindset Hockey` : 'Routine — Mindset Hockey' };
}

export default async function WorkoutRoutinePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireFeature('workout_plans');
  const { slug } = await params;

  // RLS scopes this to published, entitled rows — a locked or unpublished
  // slug returns null and 404s, the same pattern every other detail page here uses.
  const routine = await getWorkoutRoutineBySlug(slug);
  if (!routine) notFound();

  // workout_completions' RLS requires premium to write (a pre-existing rule,
  // left untouched) even though viewing/starting a routine only needs basic —
  // so the "mark complete" control is premium-only; everyone else can still
  // do the routine, they just don't get a checkmark for it.
  const canComplete = canUse(session, 'mindset_training');
  const [completedIds, pairedNutrition] = await Promise.all([
    canComplete ? getCompletedSessionIds(session) : Promise.resolve(new Set<string>()),
    isRoutineOccasion(routine.occasion) && OCCASION_NUTRITION_CATEGORY[routine.occasion]
      ? getCookbook({ category: OCCASION_NUTRITION_CATEGORY[routine.occasion] })
      : Promise.resolve(null),
  ]);
  const isComplete = routine.sessionId ? completedIds.has(routine.sessionId) : false;
  const pairedRecipes = (pairedNutrition?.recipes ?? []).slice(0, 2);

  async function toggleComplete() {
    'use server';
    const s = await requireFeature('workout_plans');
    if (!canUse(s, 'mindset_training') || !routine!.sessionId) return;
    const supabase = await createServerClient();
    if (isComplete) {
      await supabase
        .from('workout_completions')
        .delete()
        .eq('profile_id', s.userId)
        .eq('session_id', routine!.sessionId);
    } else {
      await supabase
        .from('workout_completions')
        .upsert({ profile_id: s.userId, session_id: routine!.sessionId }, { onConflict: 'profile_id,session_id' });
    }
    revalidatePath(`/workouts/${slug}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>{isRoutineOccasion(routine.occasion) ? OCCASION_LABEL[routine.occasion] : routine.occasion}</Eyebrow>
            {isComplete && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-300">
                Completed
              </span>
            )}
          </div>
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
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">Equipment</p>
            <p className="mt-1 text-[14.5px] font-semibold text-white">
              {routine.equipment.length > 0 ? routine.equipment.join(', ') : 'None needed'}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">When to use</p>
            <p className="mt-1 text-[13.5px] text-silver">{routine.whenToUse ?? '—'}</p>
          </div>
        </div>

        {routine.sessionId && (
          <div className="mt-5 border-t border-white/[.06] pt-5">
            {canComplete ? (
              <form action={toggleComplete}>
                <Button type="submit" size="sm" variant={isComplete ? 'ghost' : 'primary'}>
                  {isComplete ? 'Mark Not Done' : 'Mark Routine Complete'}
                </Button>
              </form>
            ) : (
              <p className="text-[12.5px] text-silver-dim">
                Completion tracking is included with Premium.{' '}
                <Link href="/upgrade?need=premium" className="font-semibold text-electric-glow underline underline-offset-4">
                  Upgrade
                </Link>
              </p>
            )}
          </div>
        )}
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

      {/* Simple tag-based nutrition pairing (Phase 8) — not a recommendation
          engine, just a shared occasion category surfaced on both sides. */}
      {pairedRecipes.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="display text-[17px]">Pairs Well With</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pairedRecipes.map((r) => (
              <Link key={r.id} href={`/nutrition/${r.slug}`}>
                <Card hover className="p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-electric-glow">
                    {CATEGORY_LABEL[r.category as RecipeCategory] ?? r.category}
                  </p>
                  <p className="mt-1 text-[13.5px] font-semibold text-white">{r.title}</p>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
