import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { getLibrary, parsePillar } from '@/lib/library';
import { PILLARS } from '@/lib/types';
import { Card, EmptyState, LockBadge, PageHeading, PillarChip, formatDuration } from '@/components/ui';

export const metadata = { title: 'Training Library' };

/**
 * Never cached. A lesson published in /admin/content has to appear here on the
 * member's next page load — without a redeploy and without a revalidation
 * window. The page already reads cookies via requireSession(), which makes it
 * dynamic; this states the requirement rather than relying on that side effect.
 */
export const dynamic = 'force-dynamic';

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string }>;
}) {
  const session = await requireSession();
  const { pillar } = await searchParams;

  // An unrecognised pillar falls back to the All view rather than 404ing.
  const active = parsePillar(pillar);

  const { resources, counts, unavailable } = await getLibrary(session, active);

  return (
    <>
      <PageHeading
        eyebrow="Training library"
        title="Every video, filed by pillar"
        sub="Nothing loose, nothing random. Each lesson belongs to exactly one of the Six Pillars so your player always knows what he's working on and why."
      />

      {/* filters — every count is read from the database, none are hardcoded */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/library"
          className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            !active ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
          }`}
        >
          All ({counts.all})
        </Link>
        {PILLARS.map((p) => (
          <Link
            key={p.key}
            href={`/library?pillar=${p.key}`}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              active === p.key
                ? 'bg-electric text-white'
                : 'border border-white/[.1] text-silver-dim hover:text-white'
            }`}
          >
            {p.label} ({counts[p.key]})
          </Link>
        ))}
      </div>

      {resources.length === 0 ? (
        <EmptyState
          title={unavailable ? 'Library unavailable' : 'Nothing here yet'}
          body={
            unavailable
              ? 'The content database is not reachable right now. Nothing is missing — this page shows real lessons only, so it stays empty rather than showing samples.'
              : active
                ? 'No published lessons in this pillar yet. New lessons appear here the moment they are published.'
                : 'No lessons have been published yet. They appear here as soon as they go live.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            // A locked card links to the upgrade page, never to the lesson.
            const href = r.locked ? `/upgrade?need=${r.requiredTier}` : `/library/${r.id}`;
            return (
              <Link key={r.id} href={href} className="block">
                <Card hover className="h-full overflow-hidden">
                  <div className="relative grid aspect-video place-items-center border-b border-white/[.06] bg-navy-800">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-full ${
                        r.locked ? 'bg-white/[.06]' : 'bg-electric shadow-[0_8px_28px_rgba(10,132,255,.45)]'
                      }`}
                    >
                      {r.locked ? (
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
                    {r.durationSec !== null && (
                      <span className="absolute bottom-2.5 right-3 rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold tabular-nums text-silver">
                        {formatDuration(r.durationSec)}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <PillarChip pillar={r.pillar} />
                      {r.locked && <LockBadge tier={r.requiredTier} />}
                    </div>
                    <h3 className="text-[16px] font-semibold leading-snug text-white">{r.title}</h3>
                    {r.description && (
                      <p className="mt-2 text-[13.5px] leading-relaxed text-silver-dim">{r.description}</p>
                    )}
                    {r.category && (
                      <p className="mt-3 text-[11px] uppercase tracking-[.14em] text-silver-dim">
                        {r.category}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {resources.length > 0 && (
        <Card className="mt-8 p-6 text-center">
          <p className="text-[14px] text-silver-dim">
            Locked lessons stay visible on purpose — you should be able to see exactly what the next
            tier gives you before you pay for it.
          </p>
        </Card>
      )}
    </>
  );
}
