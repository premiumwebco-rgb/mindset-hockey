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
        <div className="mt-8 grid gap-3">
          {lessons.map((l) => (
            <Card key={l.id} hover className="flex items-center gap-4 p-5">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[13px] font-bold ${
                  l.completed
                    ? 'border-[#3ddc84]/50 bg-[#3ddc84]/15 text-[#3ddc84]'
                    : 'border-white/15 text-silver-dim'
                }`}
              >
                {l.completed ? '✓' : l.week}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{l.title}</p>
                <p className="mt-0.5 text-[14px] text-silver-dim">{l.summary}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">
                {l.topic}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
