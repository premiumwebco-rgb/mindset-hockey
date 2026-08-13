import { requireTier } from '@/lib/session';
import { LESSONS, DRILLS } from '@/lib/demo-data';
import { RUBRIC } from '@/lib/types';
import { Button, Card, PageHeading, VideoPlaceholder, formatDuration } from '@/components/ui';

export const metadata = { title: 'Shot Mechanics Course' };

export default async function ShotCourse() {
  await requireTier('basic');

  const modules = LESSONS.filter((l) => l.moduleTitle === 'Shot Mechanics Course');

  return (
    <>
      <PageHeading
        eyebrow="The flagship"
        title="Shot Mechanics Course"
        sub="Seven mechanics, seven modules. A slow shot is almost always one or two of these failing — and once you can name which, it stops being a mystery and becomes a task."
      />

      <div className="mb-8">
        <VideoPlaceholder label="Course intro — 6:20" />
      </div>

      <div className="mb-10 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-6">
          <h2 className="display mb-4 text-[20px]">The modules</h2>
          <ol className="grid gap-2">
            {modules.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center gap-4 rounded-lg border border-white/[.06] bg-ink px-4 py-3.5 transition-colors hover:border-electric/40"
              >
                <span className="display grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-700 text-[14px]">
                  {i}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-white">{m.title}</p>
                  <p className="truncate text-[13px] text-silver-dim">{m.summary}</p>
                </div>
                <span className="shrink-0 text-[12.5px] tabular-nums text-silver-dim">
                  {formatDuration(m.durationSec)}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-6">
          <h2 className="display mb-2 text-[20px]">How it&apos;s scored</h2>
          <p className="mb-5 text-[14px] text-silver-dim">
            Every video analysis is scored 1–10 against these same seven points. Course, rubric and
            drill prescriptions all use one framework — so nothing your player learns here is
            disconnected from the feedback he gets.
          </p>
          <div className="display text-[52px] leading-none">
            /70<span className="ml-2 align-middle text-[13px] font-sans font-semibold uppercase tracking-[.16em] text-silver-dim">
              total
            </span>
          </div>
          <Button href="/reviews/new" variant="ghost" block>
            Submit film for review
          </Button>
        </Card>
      </div>

      <h2 className="display mb-4 text-[24px]">The 7-point framework</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {RUBRIC.map((r) => {
          const fixes = DRILLS.filter((d) => d.rubricPoints.includes(r.id));
          return (
            <Card key={r.id} className="p-6">
              <p className="eyebrow mb-3">Point {String(r.id).padStart(2, '0')}</p>
              <h3 className="display text-[21px]">{r.label}</h3>

              <dl className="mt-4 grid gap-3 text-[14px]">
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                    What good looks like
                  </dt>
                  <dd className="mt-1 text-silver">{r.looksLike}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                    Most common flaw
                  </dt>
                  <dd className="mt-1 text-silver">{r.commonFlaw}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                    The fix
                  </dt>
                  <dd className="mt-1 text-electric-glow">{r.fix}</dd>
                </div>
              </dl>

              {fixes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[.06] pt-4">
                  {fixes.map((f) => (
                    <span
                      key={f.id}
                      className="rounded-md bg-white/[.05] px-2 py-1 text-[11px] font-semibold text-silver-dim"
                    >
                      {f.title}
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
