import Link from 'next/link';
import { requireFeature } from '@/lib/session';
import {
  getWorkoutPlans,
  getWorkoutRoutines,
  OCCASION_LABEL,
  ROUTINE_OCCASIONS,
  ROUTINE_DIFFICULTIES,
  isRoutineOccasion,
  type RoutineDifficulty,
} from '@/lib/data';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Workouts & Routines — Mindset Hockey' };

const PHASE_LABEL: Record<string, string> = {
  in_season: 'In-season',
  off_season: 'Off-season',
  playoffs: 'Playoffs',
};

const DURATION_BUCKETS = [
  { key: 'quick', label: 'Under 15 min', test: (m: number | null) => m !== null && m < 15 },
  { key: 'mid', label: '15–30 min', test: (m: number | null) => m !== null && m >= 15 && m <= 30 },
  { key: 'long', label: '30+ min', test: (m: number | null) => m !== null && m > 30 },
] as const;

function isDifficulty(v: unknown): v is RoutineDifficulty {
  return typeof v === 'string' && (ROUTINE_DIFFICULTIES as readonly string[]).includes(v);
}

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; duration?: string; difficulty?: string; q?: string }>;
}) {
  await requireFeature('workout_plans');
  const { occasion, duration, difficulty, q } = await searchParams;

  const activeOccasion = isRoutineOccasion(occasion) ? occasion : null;
  const activeDuration = DURATION_BUCKETS.find((b) => b.key === duration) ?? null;
  const activeDifficulty = isDifficulty(difficulty) ? difficulty : null;
  const query = (q ?? '').trim().toLowerCase();

  const [routines, plans] = await Promise.all([getWorkoutRoutines(), getWorkoutPlans()]);

  let filtered = routines;
  if (activeOccasion) filtered = filtered.filter((r) => r.occasion === activeOccasion);
  if (activeDuration) filtered = filtered.filter((r) => activeDuration.test(r.durationMin));
  if (activeDifficulty) filtered = filtered.filter((r) => r.difficulty === activeDifficulty);
  if (query) filtered = filtered.filter((r) => r.title.toLowerCase().includes(query));

  const buildHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const next = { occasion: activeOccasion, duration: activeDuration?.key ?? null, difficulty: activeDifficulty, ...overrides };
    if (next.occasion) params.set('occasion', next.occasion);
    if (next.duration) params.set('duration', next.duration);
    if (next.difficulty) params.set('difficulty', next.difficulty);
    const qs = params.toString();
    return qs ? `/workouts?${qs}` : '/workouts';
  };

  return (
    <div>
      <Eyebrow>Strength, Conditioning &amp; Routines</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Workouts</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Pick the situation you&apos;re in — pre-game, post-practice, a travel day — and get a
        structured routine you can follow start to finish. Longer strength &amp; conditioning
        blocks are below.
      </p>

      {/* -------------------------------------------------- routine browser --- */}
      <div className="mt-8">
        <h2 className="display text-[20px]">Structured routines</h2>

        <form action="/workouts" method="get" className="mt-4">
          {activeOccasion && <input type="hidden" name="occasion" value={activeOccasion} />}
          {activeDuration && <input type="hidden" name="duration" value={activeDuration.key} />}
          {activeDifficulty && <input type="hidden" name="difficulty" value={activeDifficulty} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search routines…"
            className="min-h-[44px] w-full max-w-sm rounded-lg border border-white/[.12] bg-white/[.03] px-4 py-2.5 text-[14.5px] text-white placeholder:text-silver-dim focus:border-electric focus:outline-none"
          />
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildHref({ occasion: null })}
            className={`min-h-[40px] rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold ${
              !activeOccasion ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
            }`}
          >
            All occasions
          </Link>
          {ROUTINE_OCCASIONS.map((key) => (
            <Link
              key={key}
              href={buildHref({ occasion: activeOccasion === key ? null : key })}
              className={`min-h-[40px] rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold ${
                activeOccasion === key ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
              }`}
            >
              {OCCASION_LABEL[key]}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Duration</span>
          {DURATION_BUCKETS.map((b) => (
            <Link
              key={b.key}
              href={buildHref({ duration: activeDuration?.key === b.key ? null : b.key })}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold ${
                activeDuration?.key === b.key
                  ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                  : 'bg-white/[.05] text-silver-dim hover:text-white'
              }`}
            >
              {b.label}
            </Link>
          ))}
          <span className="ml-3 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Difficulty</span>
          {ROUTINE_DIFFICULTIES.map((d) => (
            <Link
              key={d}
              href={buildHref({ difficulty: activeDifficulty === d ? null : d })}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold capitalize ${
                activeDifficulty === d
                  ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                  : 'bg-white/[.05] text-silver-dim hover:text-white'
              }`}
            >
              {d}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={routines.length === 0 ? 'No routines published yet' : 'No routines match those filters'}
              body={
                routines.length === 0
                  ? 'Your coach is building these now — check back shortly.'
                  : 'Try clearing a filter or searching a different term.'
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Link key={r.id} href={`/workouts/${r.slug}`} className="block">
                <Card hover className="h-full p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-electric-glow">
                      {isRoutineOccasion(r.occasion) ? OCCASION_LABEL[r.occasion] : r.occasion}
                    </span>
                    {r.difficulty && (
                      <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] capitalize text-silver-dim">
                        {r.difficulty}
                      </span>
                    )}
                  </div>
                  <h3 className="display mt-4 text-[19px]">{r.title}</h3>
                  {r.purpose && <p className="mt-2 text-[14px] text-silver-dim">{r.purpose}</p>}
                  {r.durationMin !== null && (
                    <p className="mt-4 text-[12.5px] font-semibold text-silver-dim">{r.durationMin} minutes</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* --------------------------------------------- multi-week programs --- */}
      <div className="mt-14">
        <h2 className="display text-[20px]">Multi-week programs</h2>
        <p className="mt-1.5 text-[13.5px] text-silver-dim">
          Longer, periodised strength &amp; conditioning blocks.
        </p>

        {plans.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No programs published yet" body="Your coach is building these now — check back shortly." />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}
