'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkCompleteButton({
  slug,
  initialCompleted,
}: {
  slug: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !completed;
    try {
      const res = await fetch(`/api/mindset/${slug}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      setCompleted(next);
      // Refreshes /mindset's list + the dashboard's completion count next visit.
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
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-[10px] px-6 py-3 text-[14px] font-bold transition-all disabled:opacity-50 ${
          completed
            ? 'border border-[#3ddc84]/50 bg-[#3ddc84]/10 text-[#3ddc84] hover:bg-[#3ddc84]/15'
            : 'bg-electric text-white hover:bg-electric-glow'
        }`}
      >
        {completed ? '✓ Completed' : busy ? 'Saving…' : 'Mark lesson complete'}
      </button>
      {error && <p className="mt-2 text-[13px] text-rink-red">{error}</p>}
    </div>
  );
}
