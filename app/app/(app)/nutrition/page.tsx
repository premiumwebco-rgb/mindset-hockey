import { requireFeature } from '@/lib/session';
import { getMealPlans } from '@/lib/data';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Nutrition & Meal Plans — Mindset Hockey' };

export default async function NutritionPage() {
  await requireFeature('nutrition_plans');
  const plans = await getMealPlans();

  return (
    <div>
      <Eyebrow>Fuelling</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Nutrition &amp; meal plans</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Performance-focused plans with grocery lists, hydration guidance and the recovery window
        that most young players waste.
      </p>

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No plans published yet" body="Your coach is building these now — check back shortly." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {plans.map((m) => (
            <Card key={m.id} hover className="p-6">
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">
                {m.goal}
              </span>
              <h3 className="display mt-4 text-[21px]">{m.title}</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">{m.description}</p>
              {(m.calories || m.protein_g) && (
                <div className="mt-4 flex gap-5 border-t border-white/[.08] pt-4">
                  {m.calories && (
                    <div>
                      <b className="display block text-[20px] text-electric-glow">{m.calories}</b>
                      <span className="text-[10px] uppercase tracking-widest text-silver-dim">kcal / day</span>
                    </div>
                  )}
                  {m.protein_g && (
                    <div>
                      <b className="display block text-[20px] text-electric-glow">{m.protein_g}g</b>
                      <span className="text-[10px] uppercase tracking-widest text-silver-dim">protein</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
