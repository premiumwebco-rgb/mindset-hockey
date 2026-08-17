'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Delete + request-review controls.
 *
 * Deletion removes the stored video as well as the row, so a member can always
 * get their footage off the platform. That is deliberately allowed even on a
 * lapsed membership — see the RLS delete policy in migration 0004.
 */
export default function DeleteAnalysis({
  id,
  canRequestReview,
}: {
  id: string;
  canRequestReview: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewRequested, setReviewRequested] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not delete that analysis.');
      router.push('/analysis');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function requestReview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestReview: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not request a review.');
      setReviewRequested(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-white/[.08] pt-6">
      {error && <p className="mb-3 text-[13.5px] text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {canRequestReview && !reviewRequested && (
          <button
            type="button"
            onClick={requestReview}
            disabled={busy}
            className="min-h-[44px] rounded-[10px] border border-white/[.14] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:border-electric hover:bg-electric/10 disabled:opacity-40"
          >
            Send this to a coach
          </button>
        )}

        {reviewRequested && (
          <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-amber">
            Sent for coach review
          </span>
        )}

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="-m-2 inline-flex min-h-[44px] items-center p-2 text-[13.5px] font-semibold text-silver-dim underline underline-offset-4 hover:text-red-300"
          >
            Delete this analysis and video
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-[13.5px] text-silver">
              Delete permanently? The video goes too.
            </span>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="min-h-[44px] rounded-[10px] bg-rink-red px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="-m-2 inline-flex min-h-[44px] items-center p-2 text-[13.5px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
            >
              Cancel
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
