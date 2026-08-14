'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-runs the vision model against the frames archived on the first attempt.
 *
 * Sends no `frames` key — the server reads them back from the private
 * analysis-frames bucket, so a transient model failure or a killed serverless
 * function does not cost the member another 200 MB upload.
 *
 * This cannot produce a result on its own. It asks the server to try again and
 * then refreshes; whatever the page shows afterwards came from the model.
 */
export default function RetryAnalysis({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ analysisId: id }),
      });
      const json = await res.json().catch(() => ({}));

      // 202 means it ran but was routed to a coach — not a failure to report.
      if (!res.ok && res.status !== 202) {
        throw new Error(json.error ?? 'The analysis could not be restarted.');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={retry}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:opacity-50"
      >
        {busy ? 'Running analysis…' : 'Run the analysis again'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13.5px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
