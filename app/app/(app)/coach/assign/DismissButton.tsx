'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dismissal is a status update (assignments.status -> 'dismissed'), never a
 * delete — PATCH /api/coach/assignments/[id] is the only write path, and
 * there is no delete RLS policy on the table at all.
 */
export default function DismissButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      const res = await fetch(`/api/coach/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Could not dismiss assignment.');
      }
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={busy}
      className="shrink-0 rounded-lg border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-silver-dim transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {busy ? 'Dismissing…' : 'Dismiss'}
    </button>
  );
}
