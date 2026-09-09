'use client';

import { useState } from 'react';
import { centsToDisplay } from '@/lib/customPlan';

interface SessionForDisplay {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  priceCents: number;
  capacity: number | null;
  status: 'scheduled' | 'cancelled';
  spotsTaken: number;
  registered: boolean;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GroupSessionList({ sessions }: { sessions: SessionForDisplay[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function register(sessionId: string) {
    setBusyId(sessionId);
    setError(null);
    try {
      const res = await fetch('/api/stripe/group-session/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "We couldn't start that checkout. You were not charged.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setBusyId(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-6 text-center text-[13.5px] text-white/50">
        No upcoming group sessions right now — check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {error && <p className="text-[13px] text-[#ff6b85]">{error}</p>}
      {sessions.map((s) => {
        const full = s.capacity !== null && s.spotsTaken >= s.capacity;
        const cancelled = s.status === 'cancelled';
        return (
          <div
            key={s.id}
            className={`rounded-xl border p-4 ${
              cancelled
                ? 'border-white/10 bg-white/[.02] opacity-60'
                : s.registered
                  ? 'border-[#3ddc84]/40 bg-[#3ddc84]/[.06]'
                  : 'border-white/10 bg-white/[.03]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-white">{s.title}</p>
                <p className="mt-0.5 text-[12.5px] text-white/50">{formatWhen(s.startAt)}</p>
              </div>
              <span className="shrink-0 text-[13px] font-bold text-white">
                {centsToDisplay(s.priceCents)}
              </span>
            </div>
            {s.description && (
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">{s.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] text-white/40">
                {s.capacity !== null
                  ? `${Math.max(s.capacity - s.spotsTaken, 0)} spot${
                      s.capacity - s.spotsTaken === 1 ? '' : 's'
                    } left`
                  : 'Open registration'}
              </p>
              {cancelled ? (
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-white/50">
                  Cancelled
                </span>
              ) : s.registered ? (
                <span className="rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3ddc84]">
                  You&apos;re registered
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => register(s.id)}
                  disabled={busyId === s.id || full}
                  className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-gradient-to-b from-[#f6d896] to-[#d4a24e] px-4 py-2 text-[13px] font-bold text-[#1a1200] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {busyId === s.id ? 'Opening checkout…' : full ? 'Full' : 'Register & Pay'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
