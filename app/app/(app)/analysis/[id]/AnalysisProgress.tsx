'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ==========================================================================
   IN-PROGRESS / STALLED / RETRY

   Before this existed, an analysis in any state other than `analyzed`,
   `in_review` or `failed` rendered a page header above an empty body — a
   member who opened their report while it was still running saw a blank
   screen with no explanation and no way to recover.

   Three honest states:

     running   the model is working. Poll until it is not.
     stalled   it has been sitting in `analyzing` far longer than a run takes.
               The serverless function was almost certainly killed. Offer a
               retry rather than leaving the row stuck forever.
     queued    uploaded, not yet started.

   Retry re-runs the model against the frames archived on the first attempt,
   so the member never re-uploads. Nothing here produces or displays a score;
   it only reports what the server says the state is.
   ========================================================================== */

const POLL_MS = 4000;

export default function AnalysisProgress({
  id,
  status,
  startedAtIso,
  stalledAfterMs,
  canRetry,
}: {
  id: string;
  status: 'uploading' | 'queued' | 'analyzing';
  startedAtIso: string | null;
  stalledAfterMs: number;
  canRetry: boolean;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const started = startedAtIso ? new Date(startedAtIso).getTime() : Date.now();
  const runningMs = Date.now() - started + elapsed;
  const stalled = status === 'analyzing' && runningMs > stalledAfterMs;

  // Poll the server for a state change. router.refresh() re-runs the page's
  // server component, which re-reads the row — no client-side DB access.
  useEffect(() => {
    if (stalled) return;
    const t = setInterval(() => {
      setElapsed((e) => e + POLL_MS);
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [stalled, router]);

  async function retry() {
    setRetrying(true);
    setError(null);
    try {
      // No `frames` key — the server reads the archived frames back from
      // storage. See app/api/analysis/run/route.ts.
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ analysisId: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        throw new Error(json.error ?? 'The retry could not be started.');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  if (stalled) {
    return (
      <div className="mt-6 rounded-xl border border-amber/40 bg-amber/[.07] px-6 py-5">
        <h2 className="display text-[19px] text-amber">This analysis stopped partway</h2>
        <p className="mt-2 max-w-[64ch] text-[14.5px] text-silver">
          It has been running far longer than an analysis takes, which almost always means the job
          was interrupted rather than that anything is wrong with your clip. No scores were produced
          and nothing has been invented.
        </p>
        <p className="mt-2 max-w-[64ch] text-[13.5px] text-silver-dim">
          Your video and the frames pulled from it are both still stored, so a retry does not need
          another upload.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-[13.5px] text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {canRetry && (
            <button
              onClick={retry}
              disabled={retrying}
              className="inline-flex items-center justify-center rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:opacity-50"
            >
              {retrying ? 'Restarting…' : 'Retry analysis'}
            </button>
          )}
          <a
            href="/analysis/new"
            className="inline-flex items-center justify-center rounded-[10px] border border-white/[.14] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:border-electric"
          >
            Upload a different clip
          </a>
        </div>
      </div>
    );
  }

  const copy =
    status === 'analyzing'
      ? 'Your video is being analyzed. Ten mechanics categories are being graded from the frames pulled around the release.'
      : status === 'uploading'
        ? 'Your video is still uploading.'
        : 'Your clip is uploaded and queued. Analysis starts in a moment.';

  return (
    <div className="mt-6 rounded-xl border border-electric/40 bg-electric/[.07] px-6 py-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-electric border-t-transparent"
        />
        <h2 className="display text-[19px] text-electric-glow">
          {status === 'analyzing' ? 'Analysis in progress' : 'Getting your clip ready'}
        </h2>
      </div>

      <p className="mt-2 max-w-[64ch] text-[14.5px] text-silver" role="status" aria-live="polite">
        {copy}
      </p>
      <p className="mt-2 text-[13px] text-silver-dim">
        This usually takes 20–60 seconds. This page updates on its own — you can leave and come back.
      </p>
    </div>
  );
}
