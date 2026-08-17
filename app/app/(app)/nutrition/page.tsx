import Link from 'next/link';
import { requireFeature } from '@/lib/session';
import {
  getCookbook,
  parseCategory,
  parseTiming,
  RECIPE_CATEGORIES,
  CATEGORY_LABEL,
  TIMING_WINDOWS,
  TIMING_LABEL,
  formatMinutes,
  type RecipeCard,
} from '@/lib/nutrition';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Athlete Nutrition — Mindset Hockey' };

/** Filters come from the URL, so the page must never be statically cached. */
export const dynamic = 'force-dynamic';

/* ==========================================================================
   ATHLETE NUTRITION COOKBOOK

   Premium-gated by requireFeature('nutrition_plans') — the same gate the old
   nutrition page used, unchanged. Every read below then goes through the
   session client, so Postgres RLS (0012) is what actually decides which rows
   come back. Nothing here re-implements the tier check.

   All filtering and search is done in the database. The URL is the state:
   ?q=&category=&timing=&quick=&travel=&max= — which makes every filtered view
   shareable and survives a refresh.
   ========================================================================== */

interface SearchParams {
  q?: string;
  category?: string;
  timing?: string;
  quick?: string;
  travel?: string;
  max?: string;
}

/** Builds a filter URL, preserving the other active filters and toggling one. */
function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v) next[k] = String(v);
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/nutrition?${qs}` : '/nutrition';
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireFeature('nutrition_plans');
  const sp = await searchParams;

  const category = parseCategory(sp.category);
  const timing = parseTiming(sp.timing);
  const maxMinutes = sp.max ? Number.parseInt(sp.max, 10) : null;

  const { recipes, counts, total, unavailable } = await getCookbook({
    q: sp.q,
    category,
    timing,
    quick: sp.quick === '1',
    travel: sp.travel === '1',
    maxMinutes: Number.isFinite(maxMinutes) ? maxMinutes : null,
  });

  const anyFilter = Boolean(
    sp.q || sp.category || sp.timing || sp.quick || sp.travel || sp.max
  );

  return (
    <div>
      <Eyebrow>Athlete nutrition</Eyebrow>
      <h1 className="display text-[clamp(26px,5vw,44px)]">Eat to perform</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] text-silver sm:mt-3 sm:text-[16px]">
        Fuel for games, practices, lifts and travel — built for hockey players, not dieters.
      </p>

      {/* ---------------------------------------------------- quick choices */}
      <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Before a game', href: buildHref({}, { category: 'pre_game' }) },
          { label: 'After a game', href: buildHref({}, { category: 'post_game' }) },
          { label: 'Before practice', href: buildHref({}, { category: 'pre_practice' }) },
          { label: 'After practice', href: buildHref({}, { category: 'post_practice' }) },
          { label: 'Before a workout', href: buildHref({}, { category: 'pre_workout' }) },
          { label: 'After a workout', href: buildHref({}, { category: 'post_workout' }) },
          { label: 'On the road', href: buildHref({}, { category: 'road' }) },
          { label: 'Only 10 minutes', href: buildHref({}, { max: '10' }) },
        ].map((c) => (
          <Link key={c.label} href={c.href}>
            <Card hover className="p-3 text-[13.5px] font-semibold text-white sm:p-3.5 sm:text-[14px]">
              {c.label}
            </Card>
          </Link>
        ))}
      </div>

      {/* ----------------------------------------------------------- search */}
      <form action="/nutrition" method="get" className="mt-6 flex gap-2 sm:mt-8">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search — chicken, high protein, pre-game, smoothie…"
          aria-label="Search recipes"
          className="min-w-0 flex-1 rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white placeholder:text-silver-dim/60"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[10px] bg-electric px-5 py-3 text-[14px] font-bold text-white hover:bg-electric-glow"
        >
          Search
        </button>
      </form>

      {/* ---------------------------------------------------------- filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterChip href={buildHref({}, {})} active={!anyFilter} label="All" />
        <FilterChip
          href={buildHref(sp, { quick: sp.quick === '1' ? undefined : '1' })}
          active={sp.quick === '1'}
          label="Quick"
        />
        <FilterChip
          href={buildHref(sp, { travel: sp.travel === '1' ? undefined : '1' })}
          active={sp.travel === '1'}
          label="Travel friendly"
        />
        <FilterChip
          href={buildHref(sp, { max: sp.max === '20' ? undefined : '20' })}
          active={sp.max === '20'}
          label="Under 20 min"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {RECIPE_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            href={buildHref(sp, { category: category === c ? undefined : c })}
            active={category === c}
            label={`${CATEGORY_LABEL[c]}${counts[c] ? ` (${counts[c]})` : ''}`}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {TIMING_WINDOWS.map((t) => (
          <FilterChip
            key={t}
            href={buildHref(sp, { timing: timing === t ? undefined : t })}
            active={timing === t}
            label={TIMING_LABEL[t]}
          />
        ))}
      </div>

      {/* ----------------------------------------------------------- results */}
      {unavailable ? (
        <div className="mt-8">
          <EmptyState
            title="Cookbook unavailable"
            body="The content database is not reachable right now. This page shows real recipes only, so it stays empty rather than showing samples."
          />
        </div>
      ) : recipes.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={anyFilter ? 'No recipes match those filters' : 'No recipes published yet'}
            body={
              anyFilter
                ? 'Try clearing a filter or searching for something broader.'
                : 'Your coach is building the cookbook now — check back shortly.'
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-[13px] text-silver-dim">
            {total} {total === 1 ? 'recipe' : 'recipes'}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeTile key={r.id} recipe={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`-my-1 shrink-0 rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
        active
          ? 'bg-electric text-white'
          : 'border border-white/[.1] text-silver-dim hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function RecipeTile({ recipe: r }: { recipe: RecipeCard }) {
  return (
    <Link href={`/nutrition/${r.slug}`} className="block">
      <Card hover className="h-full p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-white sm:text-[16px]">
            {r.title}
          </h3>
          {r.isQuick && (
            <span className="shrink-0 rounded bg-electric/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-electric-glow">
              Quick
            </span>
          )}
        </div>

        {r.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-silver-dim">
            {r.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] tabular-nums text-silver">
          <span>⚡ {formatMinutes(r.totalMinutes)}</span>
          {r.proteinG !== null && <span>💪 {r.proteinG}g protein</span>}
          {r.carbsG !== null && <span>🍚 {r.carbsG}g carbs</span>}
          {r.calories !== null && <span>🔥 ~{r.calories} cal</span>}
        </div>

        <p className="mt-3 text-[11px] uppercase tracking-[.12em] text-silver-dim">
          {CATEGORY_LABEL[r.category as keyof typeof CATEGORY_LABEL] ?? r.category}
        </p>
      </Card>
    </Link>
  );
}
