import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import {
  getRecipeBySlug,
  formatIngredient,
  formatMinutes,
  nutritionLabel,
  CATEGORY_LABEL,
  TIMING_LABEL,
  type TimingWindow,
} from '@/lib/nutrition';
import { Card, Eyebrow } from '@/components/ui';

export const metadata = { title: 'Recipe — Mindset Hockey' };

export const dynamic = 'force-dynamic';

/* ==========================================================================
   RECIPE DETAIL

   Gated per-row, not per-feature: nutrition_recipes.required_tier decides
   visibility through RLS (nutrition_recipes_read), the same pattern
   workouts/[slug] and library/[id] use. A specific recipe can be unlocked to
   'basic' independent of the feature's overall premium default (e.g. the
   handful of preview items new Standard members see on their dashboard), so
   this page only requires a signed-in session and lets getRecipeBySlug()
   return null — for a locked OR a draft recipe alike — which renders 404.
   That 404 is indistinguishable from "does not exist", which is intended: a
   member should not be able to discover a still-premium recipe by probing
   slugs, and a direct URL cannot bypass the tier restriction either way.
   ========================================================================== */

/** Timing windows this recipe suits, as human labels. */
function timingLabels(timing: string[]): string[] {
  return timing
    .filter((t): t is TimingWindow => t in TIMING_LABEL)
    .map((t) => TIMING_LABEL[t]);
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSession();
  const { slug } = await params;

  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const bestFor = [
    recipe.isPreGame && 'Pre-game',
    recipe.isPostGame && 'Post-game',
    recipe.isPrePractice && 'Pre-practice',
    recipe.isPostPractice && 'Post-practice',
    recipe.isPreWorkout && 'Pre-workout',
    recipe.isPostWorkout && 'Post-workout',
    recipe.isRecovery && 'Recovery',
    recipe.isTournament && 'Tournament',
  ].filter(Boolean) as string[];

  const windows = timingLabels(recipe.timing);

  return (
    <>
      <Link
        href="/nutrition"
        className="-m-2 mb-3 inline-block p-2 text-[13.5px] text-silver-dim hover:text-white sm:mb-4"
      >
        ← Athlete nutrition
      </Link>

      <Eyebrow>
        {CATEGORY_LABEL[recipe.category as keyof typeof CATEGORY_LABEL] ?? recipe.category}
      </Eyebrow>
      <h1 className="display text-[clamp(24px,4.5vw,40px)]">{recipe.title}</h1>

      {recipe.description && (
        <p className="mt-2 max-w-[64ch] text-[15px] text-silver sm:mt-3 sm:text-[16px]">
          {recipe.description}
        </p>
      )}

      {/* --------------------------------------------------------- at a glance */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
        <Glance label="Total time" value={formatMinutes(recipe.totalMinutes)} />
        <Glance label="Servings" value={String(recipe.servings)} />
        {recipe.proteinG !== null && <Glance label="Protein" value={`${recipe.proteinG} g`} />}
        {recipe.calories !== null && <Glance label="Calories" value={`~${recipe.calories}`} />}
      </div>

      {bestFor.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {bestFor.map((b) => (
            <span
              key={b}
              className="rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.1em] text-electric-glow"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {windows.length > 0 && (
        <p className="mt-3 text-[13px] text-silver-dim">
          <span className="font-semibold text-silver">Best timing: </span>
          {windows.join(' · ')}
        </p>
      )}

      {recipe.whyItWorks && (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="display text-[17px] sm:text-[19px]">Why it works</h2>
          <p className="mt-2 max-w-[64ch] text-[14px] text-silver-dim sm:text-[14.5px]">
            {recipe.whyItWorks}
          </p>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* ------------------------------------------------------ ingredients */}
        <Card className="p-4 sm:p-5">
          {/* Equipment sits above ingredients deliberately: a player deciding
              what to make in a hotel room needs to know they need a blender
              before they read the shopping list. */}
          {recipe.equipment.length > 0 && (
            <p className="mb-3 text-[13.5px] text-silver-dim">
              <span className="font-semibold text-silver">You&apos;ll need: </span>
              {recipe.equipment.join(' · ')}
            </p>
          )}
          <h2 className="display text-[17px] sm:text-[19px]">Ingredients</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="mt-2 text-[13.5px] text-silver-dim">No ingredients listed yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {recipe.ingredients.map((i) => (
                <li key={i.id} className="flex gap-2 text-[14px] text-silver">
                  <span className="text-silver-dim">•</span>
                  <span>
                    {formatIngredient(i)}
                    {i.optional && (
                      <span className="ml-1.5 text-[11.5px] uppercase tracking-wider text-silver-dim">
                        optional
                      </span>
                    )}
                    {i.notes && (
                      <span className="block text-[12.5px] text-silver-dim">{i.notes}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ----------------------------------------------------- instructions */}
        <Card className="p-4 sm:p-5">
          <h2 className="display text-[17px] sm:text-[19px]">Instructions</h2>
          {recipe.steps.length === 0 ? (
            <p className="mt-2 text-[13.5px] text-silver-dim">No steps listed yet.</p>
          ) : (
            <ol className="mt-3 grid gap-3">
              {recipe.steps.map((s, idx) => (
                <li key={s.id} className="flex gap-3 text-[14px] text-silver">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-electric/15 text-[12px] font-bold text-electric-glow">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{s.body}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* --------------------------------------------------------- nutrition */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-[17px] sm:text-[19px]">
            {nutritionLabel(recipe.nutritionSource)}
          </h2>
          <span className="text-[11.5px] text-silver-dim">per serving</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {recipe.calories !== null && <Macro label="Calories" value={`~${recipe.calories}`} />}
          {recipe.proteinG !== null && <Macro label="Protein" value={`${recipe.proteinG} g`} />}
          {recipe.carbsG !== null && <Macro label="Carbs" value={`${recipe.carbsG} g`} />}
          {recipe.fatG !== null && <Macro label="Fat" value={`${recipe.fatG} g`} />}
          {recipe.fiberG !== null && <Macro label="Fiber" value={`${recipe.fiberG} g`} />}
          {recipe.sodiumMg !== null && <Macro label="Sodium" value={`${recipe.sodiumMg} mg`} />}
        </div>

        {/* The honesty line. Estimated macros are derived from standard
            reference amounts for whole foods, not laboratory analysis, and
            the UI is required to say so rather than imply precision. */}
        {recipe.nutritionSource === 'estimate' && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-silver-dim">
            These figures are <span className="text-silver">estimates</span> calculated from
            standard reference amounts for the listed ingredients. Actual values vary with
            brands, portion sizes and preparation. Use them as a guide, not a precise target.
          </p>
        )}
      </Card>

      {recipe.coachTip && (
        <Card className="mt-4 border-electric/25 bg-electric/[.05] p-4 sm:p-5">
          <h2 className="display text-[17px] sm:text-[19px]">Coach tip</h2>
          <p className="mt-2 max-w-[64ch] text-[14px] text-silver sm:text-[14.5px]">
            {recipe.coachTip}
          </p>
        </Card>
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {recipe.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-white/[.05] px-2 py-1 text-[11px] font-semibold text-silver-dim"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 sm:p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">{label}</p>
      <p className="display mt-1 text-[18px] leading-none sm:text-[20px]">{value}</p>
    </Card>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[.08] bg-navy-900 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
