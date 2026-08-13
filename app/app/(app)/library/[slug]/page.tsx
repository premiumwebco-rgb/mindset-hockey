import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession, hasTier } from '@/lib/session';
import { LESSONS, DRILLS, WEEKLY_PLAN } from '@/lib/demo-data';
import { Button, Card, PillarChip, VideoPlaceholder, formatDuration } from '@/components/ui';

export const metadata = { title: 'Lesson' };

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;

  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) notFound();
  if (!hasTier(session, lesson.requiredTier)) {
    redirect(`/upgrade?need=${lesson.requiredTier}`);
  }

  const day = WEEKLY_PLAN.days.find((d) => d.lessonSlug === slug);
  const drills = (day?.drills ?? [])
    .map((s) => DRILLS.find((d) => d.slug === s))
    .filter(Boolean);

  const siblings = LESSONS.filter(
    (l) => l.moduleTitle === lesson.moduleTitle && l.slug !== lesson.slug
  ).slice(0, 4);

  return (
    <>
      <Link href="/library" className="mb-6 inline-block text-[13.5px] text-silver-dim hover:text-white">
        ← Training library
      </Link>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PillarChip pillar={lesson.pillar} />
          {lesson.moduleTitle && (
            <span className="text-[11.5px] uppercase tracking-[.14em] text-silver-dim">
              {lesson.moduleTitle}
            </span>
          )}
        </div>
        <h1 className="display text-[clamp(26px,4vw,42px)]">{lesson.title}</h1>
        <p className="mt-3 max-w-[64ch] text-[16px] text-silver">{lesson.summary}</p>
      </div>

      <div className="mb-6">
        <VideoPlaceholder label={`${lesson.title} — ${formatDuration(lesson.durationSec)}`} />
      </div>

      {drills.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-white/[.08] bg-gradient-to-r from-electric/10 to-transparent px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-electric-glow">
              Do these now
            </p>
          </div>
          <div className="grid gap-3 p-6">
            {drills.map((d) => (
              <div
                key={d!.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[.06] bg-ink px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">{d!.title}</p>
                  <p className="mt-0.5 text-[13px] text-silver-dim">{d!.description}</p>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold text-electric-glow">
                  {d!.setsReps}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6 p-6">
        <h2 className="display mb-3 text-[19px]">Mark it done</h2>
        <p className="mb-5 max-w-[60ch] text-[14.5px] text-silver-dim">
          Logging the session is what feeds the streak, the pillar scores, and the weekly summary
          email your parents get on Sunday. Do the reps, then log it — not before.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/dashboard">Mark session complete</Button>
          <Button href="/drills" variant="ghost">
            Browse more drills
          </Button>
        </div>
      </Card>

      {siblings.length > 0 && (
        <>
          <h2 className="display mb-4 text-[20px]">Next in {lesson.moduleTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {siblings.map((s) => {
              const locked = !hasTier(session, s.requiredTier);
              return (
                <Link
                  key={s.id}
                  href={locked ? `/upgrade?need=${s.requiredTier}` : `/library/${s.slug}`}
                  className="card card-hover flex items-center gap-4 p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-700">
                    {locked ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8895A7" strokeWidth="2.2">
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    ) : (
                      <svg width="11" height="13" viewBox="0 0 22 26" fill="#fff" className="ml-0.5">
                        <path d="M22 13 0 26V0z" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-white">{s.title}</p>
                    <p className="text-[12.5px] text-silver-dim">{formatDuration(s.durationSec)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
