import Link from 'next/link';
import { requireSession, hasTier } from '@/lib/session';
import { DRILLS } from '@/lib/demo-data';
import { PILLARS, RUBRIC, type Pillar } from '@/lib/types';
import { Card, LockBadge, PageHeading, PillarChip } from '@/components/ui';

export const metadata = { title: 'Drill Database' };

export default async function Drills({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string; point?: string }>;
}) {
  const session = await requireSession();
  const { pillar, point } = await searchParams;
  const activePillar = (pillar as Pillar) || null;
  const activePoint = point ? Number(point) : null;

  let drills = DRILLS;
  if (activePillar) drills = drills.filter((d) => d.pillar === activePillar);
  if (activePoint) drills = drills.filter((d) => d.rubricPoints.includes(activePoint));

  return (
    <>
      <PageHeading
        eyebrow="Drill database"
        title="Filterable, prescribable, repeatable"
        sub="Every drill is tagged to a pillar and — where relevant — to the exact shot mechanic it fixes. That's how the analysis engine prescribes them automatically."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/drills"
          className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
            !activePillar && !activePoint
              ? 'bg-electric text-white'
              : 'border border-white/[.1] text-silver-dim hover:text-white'
          }`}
        >
          All ({DRILLS.length})
        </Link>
        {PILLARS.map((p) => (
          <Link
            key={p.key}
            href={`/drills?pillar=${p.key}`}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
              activePillar === p.key
                ? 'bg-electric text-white'
                : 'border border-white/[.1] text-silver-dim hover:text-white'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
          Fixes shot point
        </span>
        {RUBRIC.map((r) => (
          <Link
            key={r.id}
            href={`/drills?point=${r.id}`}
            className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold ${
              activePoint === r.id
                ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                : 'bg-white/[.05] text-silver-dim hover:text-white'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {drills.map((d) => {
          const locked = !hasTier(session, d.requiredTier);
          return (
            <Card key={d.id} hover className="p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PillarChip pillar={d.pillar} />
                  <span className="text-[11.5px] text-silver-dim">
                    {'●'.repeat(d.difficulty)}
                    <span className="opacity-25">{'●'.repeat(5 - d.difficulty)}</span>
                  </span>
                </div>
                {locked && <LockBadge tier={d.requiredTier} />}
              </div>

              <h3 className="text-[17px] font-semibold text-white">{d.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-silver-dim">{d.description}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[.06] pt-4 text-[13px]">
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[.14em] text-silver-dim">Prescription</dt>
                  <dd className="mt-0.5 text-silver">{d.setsReps}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[.14em] text-silver-dim">Time</dt>
                  <dd className="mt-0.5 text-silver">{d.durationMin} min</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10.5px] uppercase tracking-[.14em] text-silver-dim">Equipment</dt>
                  <dd className="mt-0.5 text-silver">
                    {d.equipment.length ? d.equipment.join(' · ') : 'None'}
                  </dd>
                </div>
              </dl>

              {d.rubricPoints.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {d.rubricPoints.map((rp) => (
                    <span
                      key={rp}
                      className="rounded-md bg-electric/10 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[.1em] text-electric-glow"
                    >
                      Fixes: {RUBRIC.find((r) => r.id === rp)?.label}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
