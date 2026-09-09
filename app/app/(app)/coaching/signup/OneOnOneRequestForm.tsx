'use client';

import { useState } from 'react';

export default function OneOnOneRequestForm({ hasPriorRequest }: { hasPriorRequest: boolean }) {
  const [availability, setAvailability] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!availability.trim()) {
      setError('Let us know what times generally work for you.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/one-on-one-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ availability, notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not submit your request.');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] p-5 text-center">
        <p className="text-[15px] font-semibold text-white">Request received</p>
        <p className="mt-2 text-[13.5px] text-white/60">
          A coach will reach out to establish your session time and take payment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {hasPriorRequest && (
        <p className="mb-4 rounded-lg border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-[12.5px] text-white/50">
          You&apos;ve submitted a request before — submitting again adds a new one (e.g. for
          another session).
        </p>
      )}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-white/45">
          Your availability
        </span>
        <textarea
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          rows={3}
          placeholder="Days/times that generally work — e.g. weekday evenings after 6pm ET"
          className="w-full rounded-[10px] border border-white/[.14] bg-black/30 px-4 py-3 text-[14.5px] text-white placeholder:text-white/30 focus:border-[#f0c674]/50 focus:outline-none"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-white/45">
          Anything else? (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What you'd like to focus on, film to review, etc."
          className="w-full rounded-[10px] border border-white/[.14] bg-black/30 px-4 py-3 text-[14.5px] text-white placeholder:text-white/30 focus:border-[#f0c674]/50 focus:outline-none"
        />
      </label>
      {error && <p className="mt-3 text-[13px] text-[#ff6b85]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-gradient-to-b from-[#f6d896] to-[#d4a24e] px-6 py-3 text-[14.5px] font-bold text-[#1a1200] transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
      >
        {busy ? 'Submitting…' : 'Request a Session'}
      </button>
    </form>
  );
}
