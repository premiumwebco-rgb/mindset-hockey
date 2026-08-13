import Link from 'next/link';
import { requireTier } from '@/lib/session';
import { PRO_BREAKDOWNS, SUBMISSIONS } from '@/lib/demo-data';
import VideoCompare from '@/components/VideoCompare';
import { Card, PageHeading } from '@/components/ui';

export const metadata = { title: 'Comparison Tool' };

export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{ pro?: string; mine?: string }>;
}) {
  await requireTier('premium');
  const { pro, mine } = await searchParams;

  const proClip = PRO_BREAKDOWNS.find((p) => p.slug === pro) ?? PRO_BREAKDOWNS[4];
  const myClips = SUBMISSIONS.filter((s) => s.playerName === 'Tyler M.');
  const mySub = myClips.find((s) => s.id === mine) ?? myClips[0];

  return (
    <>
      <Link
        href="/pro-breakdowns"
        className="mb-6 inline-block text-[13.5px] text-silver-dim hover:text-white"
      >
        ← Pro breakdowns
      </Link>

      <PageHeading
        eyebrow="Side-by-side"
        title="Comparison tool"
        sub="One transport controls both clips. Frame-step at 1/30s, slow to 0.1×, and slide the sync offset until both hit the release at the same moment."
      />

      {/* pickers */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
            Left — your player
          </p>
          <div className="grid gap-2">
            {myClips.map((s) => (
              <Link
                key={s.id}
                href={`/pro-breakdowns/compare?pro=${proClip.slug}&mine=${s.id}`}
                className={`rounded-lg border px-4 py-3 text-[14px] transition-colors ${
                  s.id === mySub?.id
                    ? 'border-electric/50 bg-electric/[.08] text-white'
                    : 'border-white/[.08] bg-ink text-silver-dim hover:border-white/25'
                }`}
              >
                {new Date(s.submittedAt).toLocaleDateString()} · {s.shotType.replace('_', ' ')}
                {s.review && (
                  <span className="ml-2 text-electric-glow">{s.review.overallScore}/70</span>
                )}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
            Right — pro clip
          </p>
          <div className="grid max-h-[168px] gap-2 overflow-y-auto pr-1">
            {PRO_BREAKDOWNS.map((p) => (
              <Link
                key={p.id}
                href={`/pro-breakdowns/compare?pro=${p.slug}&mine=${mySub?.id ?? ''}`}
                className={`rounded-lg border px-4 py-3 text-[14px] transition-colors ${
                  p.slug === proClip.slug
                    ? 'border-electric/50 bg-electric/[.08] text-white'
                    : 'border-white/[.08] bg-ink text-silver-dim hover:border-white/25'
                }`}
              >
                {p.title}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <VideoCompare
        labelLeft={`Your shot — ${mySub ? new Date(mySub.submittedAt).toLocaleDateString() : 'none'}`}
        labelRight={proClip.playerLabel}
        initialOffsetMs={proClip.releaseFrameMs - 1350}
      />

      <Card className="mt-6 p-6">
        <h3 className="display mb-2 text-[18px]">How to actually use this</h3>
        <ol className="grid gap-2 text-[14.5px] text-silver-dim">
          <li>
            <span className="font-semibold text-white">1.</span> Slide the sync offset until both
            clips release on the same frame. Nothing below matters until this is right.
          </li>
          <li>
            <span className="font-semibold text-white">2.</span> Drop to 0.1× and step backwards
            from the release, one frame at a time.
          </li>
          <li>
            <span className="font-semibold text-white">3.</span> Watch one mechanic at a time — turn
            the other overlays off. Trying to see all seven at once means seeing none of them.
          </li>
          <li>
            <span className="font-semibold text-white">4.</span> Start with the two points flagged
            on your last breakdown. Everything else is noise this month.
          </li>
        </ol>
      </Card>
    </>
  );
}
