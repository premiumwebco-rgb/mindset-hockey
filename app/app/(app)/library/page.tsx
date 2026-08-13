import Link from 'next/link';
import { requireSession, hasTier } from '@/lib/session';
import { LESSONS } from '@/lib/demo-data';
import { PILLARS, type Pillar } from '@/lib/types';
import { Card, LockBadge, PageHeading, PillarChip, formatDuration } from '@/components/ui';

export const metadata = { title: 'Training Library' };

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string }>;
}) {
  const session = await requireSession();
  const { pillar } = await searchParams;
  const active = (pillar as Pillar) || null;

  const lessons = active ? LESSONS.filter((l) => l.pillar === active) : LESSONS;

  return (
    <>
      <PageHeading
        eyebrow="Training library"
        title="Every video, filed by pillar"
        sub="Nothing loose, nothing random. Each lesson belongs to exactly one of the Six Pillars so your player always knows what he's working on and why."
      />

      {/* filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/library"
          className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            !active ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
          }`}
        >
          All ({LESSONS.length})
        </Link>
        {PILLARS.map((p) => {
          const count = LESSONS.filter((l) => l.pillar === p.key).length;
          return (
            <Link
              key={p.key}
              href={`/library?pillar=${p.key}`}
              className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                active === p.key
                  ? 'bg-electric text-white'
                  : 'border border-white/[.1] text-silver-dim hover:text-white'
              }`}
            >
              {p.label} ({count})
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => {
          const locked = !hasTier(session, lesson.requiredTier);
          return (
            <Card key={lesson.id} hover className="overflow-hidden">
              <div className="relative grid aspect-video place-items-center border-b border-white/[.06] bg-navy-800">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-full ${
                    locked ? 'bg-white/[.06]' : 'bg-electric shadow-[0_8px_28px_rgba(10,132,255,.45)]'
                  }`}
                >
                  {locked ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8895A7" strokeWidth="2.2">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  ) : (
                    <svg width="13" height="16" viewBox="0 0 22 26" fill="#fff" className="ml-0.5">
                      <path d="M22 13 0 26V0z" />
                    </svg>
                  )}
                </div>
                <span className="absolute bottom-2.5 right-3 rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold tabular-nums text-silver">
                  {formatDuration(lesson.durationSec)}
                </span>
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <PillarChip pillar={lesson.pillar} />
                  {locked && <LockBadge tier={lesson.requiredTier} />}
                </div>
                <h3 className="text-[16px] font-semibold leading-snug text-white">{lesson.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-silver-dim">{lesson.summary}</p>
                {lesson.moduleTitle && (
                  <p className="mt-3 text-[11px] uppercase tracking-[.14em] text-silver-dim">
                    {lesson.moduleTitle}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-6 text-center">
        <p className="text-[14px] text-silver-dim">
          Locked lessons stay visible on purpose — you should be able to see exactly what the next
          tier gives you before you pay for it.
        </p>
      </Card>
    </>
  );
}
