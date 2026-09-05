'use client';

import { useState } from 'react';

export default function WaitlistForm({ program }: { program: 'summer_training' | 'summer_camp' }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ program, notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not join the waitlist.');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-4 text-[14px] text-silver">
        You&apos;re on the list — a coach will reach out with details as soon as they&apos;re set.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
          Anything we should know? (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Preferred dates, age/skill level, questions…"
          className="w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[14.5px] text-white placeholder:text-silver-dim/60"
        />
      </label>

      {error && <p className="mt-3 text-[13px] text-[#ff6b85]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[15px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-50 sm:w-auto"
      >
        {busy ? 'Joining…' : 'Join the waitlist'}
      </button>
    </form>
  );
}
