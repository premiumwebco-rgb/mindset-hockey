import Link from 'next/link';
import { requirePermission } from '@/lib/session';
import { getMindsetLessons, type MindsetLessonRow } from '@/lib/data';
import { Card, Eyebrow, ProgressBar, EmptyState } from '@/components/ui';

export const metadata = { title: 'Mindset Training — Mindset Hockey' };

// Matches the 8-category taxonomy from migration 0015 / MindsetManager.tsx
// (admin). Duplicated here rather than imported, same convention already
// used between MindsetManager.tsx and app/api/admin/mindset/lessons/route.ts
// in this codebase.
const CATEGORY_ORDER = [
  'confidence', 'visualization', 'resilience', 'leadership',
  'focus', 'pressure_performance', 'goal_setting', 'mental_recovery',
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  confidence: 'Confidence',
  visualization: 'Visualization',
  resilience: 'Resilience',
  leadership: 'Leadership',
  focus: 'Focus',
  pressure_performance: 'Handling Pressure',
  goal_setting: 'Competitive Mindset',
  mental_recovery: 'Mental Recovery',
};

function LessonRow({ l }: { l: MindsetLessonRow }) {
  return (
    <Link href={`/mindset/${l.slug}`} className="block min-w-0">
      {/* Compact horizontal row on mobile — smaller icon, tighter padding,
          badge wraps under the title instead of stretching the row —
          full-size layout unchanged at sm+. */}
      <Card hover className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-bold sm:h-10 sm:w-10 sm:text-[13px] ${
            l.completed
              ? 'border-[#3ddc84]/50 bg-[#3ddc84]/15 text-[#3ddc84]'
              : 'border-white/15 text-silver-dim'
          }`}
        >
          {l.completed ? '✓' : l.week || '•'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-semibold text-white sm:text-[15px]">{l.title}</p>
            {l.hasGuide && (
              <span className="rounded-full border border-electric/40 bg-electric/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.12em] text-electric-glow">
                Skill guide
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-silver-dim sm:whitespace-normal sm:text-[14px]">{l.summary}</p>
        </div>
      </Card>
    </Link>
  );
}

export default async function MindsetPage() {
  const session = await requirePermission('mindset');
  const lessons = await getMindsetLessons(session);
  const done = lessons.filter((l) => l.completed).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  // Grouped by skill/category so the dashboard reads like a training program
  // rather than a flat 60-row list — the flagship "skill guide" lesson for
  // each skill sorts first within its group so it's the obvious place to
  // start, with that skill's other weekly lessons underneath it.
  const grouped = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    label: CATEGORY_LABEL[cat],
    lessons: lessons
      .filter((l) => l.category === cat)
      .sort((a, b) => (b.hasGuide ? 1 : 0) - (a.hasGuide ? 1 : 0) || a.week - b.week),
  })).filter((g) => g.lessons.length > 0);

  const uncategorized = lessons.filter((l) => !l.category);

  return (
    <div>
      <Eyebrow>Mindset Development</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">The mental side, coached</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Physical skills are only part of the equation. Each skill below has a full training
        guide — what it is, why it matters in hockey, and a drill for your next practice —
        plus a video and week-by-week lessons to keep building on it.
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
        <div className="mt-6 grid gap-8 sm:mt-8">
          {grouped.map((g) => (
            <div key={g.key}>
              <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[.16em] text-electric-glow">
                {g.label}
              </h2>
              <div className="grid gap-2 sm:gap-3">
                {g.lessons.map((l) => (
                  <LessonRow key={l.id} l={l} />
                ))}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[.16em] text-silver-dim">
                More
              </h2>
              <div className="grid gap-2 sm:gap-3">
                {uncategorized.map((l) => (
                  <LessonRow key={l.id} l={l} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
