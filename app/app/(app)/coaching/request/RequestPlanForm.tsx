'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CUSTOM_COACHING_SERVICES } from '@/lib/permissions';

export default function RequestPlanForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError('Select at least one service you’re interested in.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ services: Array.from(selected), notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not submit your request.');
      setDone(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <h3 className="display text-[22px]">Request received</h3>
        <p className="mx-auto mt-3 max-w-[46ch] text-[15px] text-silver-dim">
          A coach will follow up to put together pricing and next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        {CUSTOM_COACHING_SERVICES.map((s) => {
          const active = selected.has(s.key);
          return (
            <button
              type="button"
              key={s.key}
              onClick={() => toggle(s.key)}
              aria-pressed={active}
              className={`min-h-[44px] rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-electric bg-electric/10'
                  : 'border-white/[.1] hover:border-white/25'
              }`}
            >
              <p className="text-[14.5px] font-semibold text-white">{s.label}</p>
              <p className="mt-1 text-[12.5px] text-silver-dim">{s.description}</p>
            </button>
          );
        })}
      </div>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
          Anything else we should know? (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Goals, schedule constraints, anything relevant…"
          className="w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[14.5px] text-white placeholder:text-silver-dim/60"
        />
      </label>

      {error && <p className="mt-3 text-[13px] text-[#ff6b85]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[15px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-50 sm:w-auto"
      >
        {busy ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  );
}
