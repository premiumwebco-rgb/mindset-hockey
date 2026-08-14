import Link from 'next/link';
import { requireTier } from '@/lib/session';
import { PRO_BREAKDOWNS } from '@/lib/demo-data';
import type { ProLevel } from '@/lib/types';
import { Button, Card, PageHeading } from '@/components/ui';

export const metadata = { title: 'Pro Breakdowns' };

const LEVEL_LABEL: Record<ProLevel, string> = {
  junior: 'Junior A',
  aaa: 'AAA',
  college: 'College',
};

export default async function ProBreakdowns({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  await requireTier('premium');
  const { level } = await searchParams;
  const active = (level as ProLevel) || null;

  const clips = active ? PRO_BREAKDOWNS.filter((p) => p.level === active) : PRO_BREAKDOWNS;

  return (
    <>
      <PageHeading
        eyebrow="Premium membership"
        title="Elite Release Library"
        sub="Junior A and AAA shooting mechanics, annotated against the same rubric — so a 13-year-old can see exactly what the difference is instead of just being told there is one."
        action={<Button href="/pro-breakdowns/compare">Open comparison tool</Button>}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/pro-breakdowns"
          className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
            !active ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
          }`}
        >
          All levels
        </Link>
        {(['junior', 'aaa', 'college'] as ProLevel[]).map((l) => (
          <Link
            key={l}
            href={`/pro-breakdowns?level=${l}`}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
              active === l
                ? 'bg-electric text-white'
                : 'border border-white/[.1] text-silver-dim hover:text-white'
            }`}
          >
            {LEVEL_LABEL[l]}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {clips.map((clip) => (
          <Card key={clip.id} hover className="overflow-hidden">
            <div className="relative grid aspect-video place-items-center border-b border-white/[.06] bg-navy-800">
              <span className="absolute left-3 top-3 rounded-md border border-white/[.14] bg-ink/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-white">
                {LEVEL_LABEL[clip.level]}
              </span>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-electric shadow-[0_8px_28px_rgba(10,132,255,.45)]">
                <svg width="13" height="16" viewBox="0 0 22 26" fill="#fff" className="ml-0.5">
                  <path d="M22 13 0 26V0z" />
                </svg>
              </div>
              <span className="absolute bottom-2.5 right-3 rounded bg-ink/85 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[.1em] text-silver">
                {clip.shotType.replace('_', ' ')} · {clip.shoots} shot
              </span>
            </div>

            <div className="p-5">
              <h3 className="text-[16.5px] font-semibold text-white">{clip.title}</h3>
              <p className="mt-1 text-[12px] uppercase tracking-[.12em] text-silver-dim">
                {clip.playerLabel}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-silver-dim">{clip.description}</p>
              <div className="mt-4">
                <Button
                  href={`/pro-breakdowns/compare?pro=${clip.slug}`}
                  variant="ghost"
                  size="sm"
                  block
                >
                  Compare with my shot
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h3 className="display mb-2 text-[18px]">Why there are no NHL clips here</h3>
        <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-silver-dim">
          Two reasons. The practical one: the gap between a 13-year-old and an NHL winger is so
          large it isn&apos;t actionable — a Junior A release he could realistically copy changes far
          more behavior than a highlight he can&apos;t. The honest one: NHL broadcast footage belongs
          to the NHL, and re-hosting it inside a paid membership isn&apos;t ours to do. Every clip in
          this library was filmed by us, with consent.
        </p>
      </Card>
    </>
  );
}
