import Link from 'next/link';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { Eyebrow } from '@/components/ui';
import UploadAnalyzer from './UploadAnalyzer';

export const metadata = { title: 'Analyse a Shot — Mindset Hockey' };

export default async function NewAnalysis() {
  // Included with both Standard and Premium. A member without an active
  // subscription is redirected to /upgrade by this guard, and would be blocked
  // by RLS even if they got past it.
  await requireFeature('ai_shot_analysis');

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>AI Shot Analysis</Eyebrow>
          <h1 className="display text-[clamp(28px,5vw,44px)]">Analyse a shot</h1>
        </div>
        <Link
          href="/analysis"
          className="text-[14px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
        >
          Back to history
        </Link>
      </div>

      <p className="mt-3 max-w-[64ch] text-[16px] text-silver">
        Upload a clip, confirm what we are looking at, and the shot gets graded against ten
        mechanics categories.
      </p>

      {DEMO_MODE ? (
        <div className="mt-8 rounded-xl border border-dashed border-amber/40 bg-amber/[.06] px-6 py-8">
          <h2 className="display text-[20px] text-amber">Demo mode</h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] text-silver">
            Uploads and analysis need a real backend. Connect Supabase and set an AI provider key
            in <code className="text-white">.env.local</code>, then restart the dev server. Nothing
            here fabricates a sample result to fill the screen.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <UploadAnalyzer />
        </div>
      )}
    </div>
  );
}
