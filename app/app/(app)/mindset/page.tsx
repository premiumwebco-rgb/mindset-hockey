import Link from 'next/link';
import { requireFeature } from '@/lib/session';
import { getMindsetLessons } from '@/lib/data';
import { Card, Eyebrow, ProgressBar, EmptyState } from '@/components/ui';

export const metadata = { title: 'Mindset Training — Mindset Hockey' };

export default async function MindsetPage() {
  const session = await requireFeature('mindset_training');
  const lessons = await getMindsetLessons(session);
  const done = lessons.filter((l) => l.completed).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <div>
      <Eyebrow>Mindset Development</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">The mental side, coached</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Physical skills are only part of the equation. One lesson a week, each with an exercise
        and a reflection prompt — confidence, toughness, accountability and performing when it
        counts.
      </p>

      {lessons.length > 0 && (
        <div className="mt-7 max-w-md">
          <ProgressBar value={pct} label={`${done} of ${lessons.length} lessons complete`} />
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No lessons published yet" body="Your coach is building the track now." />
        </div>
      ) : (
        <div className="mt-6 grid gap-2 sm:mt-8 sm:gap-3">
          {lessons.map((l) => (
            <Link key={l.id} href={`/mindset/${l.slug}`} className="block min-w-0">
              {/* Compact horizontal row on mobile — smaller icon, tighter
                  padding, badge moves under the title instead of stretching
                  the row — full-size layout unchanged at sm+. */}
              <Card hover className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-bold sm:h-10 sm:w-10 sm:text-[13px] ${
                    l.completed
                      ? 'border-[#3ddc84]/50 bg-[#3ddc84]/15 text-[#3ddc84]'
                      : 'border-white/15 text-silver-dim'
                  }`}
                >
                  {l.completed ? '✓' : l.week}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-white sm:text-[15px]">{l.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-silver-dim sm:whitespace-normal sm:text-[14px]">{l.summary}</p>
                </div>
                <span className="hidden shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim sm:inline-block">
                  {l.topic}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
