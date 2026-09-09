'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, EmptyState } from '@/components/ui';
import { centsToDisplay } from '@/lib/customPlan';
import type { GroupCoachingSession, GroupSessionRegistration } from '@/lib/groupCoaching';

type RegistrationWithName = GroupSessionRegistration & { memberName: string };

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** yyyy-MM-ddThh:mm for a datetime-local input, in the browser's local time. */
function toLocalInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 1000 * 60 * 60 * 24);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GroupSessionsManager({
  initialSessions,
  registrationsBySession,
  demo,
}: {
  initialSessions: GroupCoachingSession[];
  registrationsBySession: Record<string, RegistrationWithName[]>;
  demo: boolean;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(toLocalInputValue());
  const [price, setPrice] = useState('10');
  const [capacity, setCapacity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('A title is required.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/group-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startAt: new Date(startAt).toISOString(),
          priceCents: Math.round(Number(price) * 100),
          capacity: capacity ? Number(capacity) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not create session.');

      setSessions((prev) => [
        {
          id: json.id,
          title,
          description: description || null,
          startAt: new Date(startAt).toISOString(),
          priceCents: Math.round(Number(price) * 100),
          capacity: capacity ? Number(capacity) : null,
          status: 'scheduled',
          createdBy: '',
          cancelledAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle('');
      setDescription('');
      setPrice('10');
      setCapacity('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSession(id: string) {
    if (!confirm('Cancel this session? Every registered member will be refunded through Stripe.')) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/admin/group-sessions/${id}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not cancel session.');
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s)));
      alert(
        `Session cancelled. Refunded ${json.refunded} registration(s)` +
          (json.failed ? `, ${json.failed} refund(s) failed — check the audit log.` : '.')
      );
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="mt-8 grid gap-10">
      <Card className="p-6">
        <h2 className="display text-[19px]">Create a Session</h2>
        {demo && <p className="mt-2 text-[12.5px] text-amber">Demo mode — no backend connected.</p>}
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Title / Topic
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hockey IQ &amp; Game Understanding"
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white placeholder:text-silver-dim/60"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Date &amp; Time
            </span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Price (USD)
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Capacity (optional)
            </span>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Leave blank for unlimited"
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white placeholder:text-silver-dim/60"
            />
          </label>
          {error && <p className="text-[13px] text-[#ff6b85] sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {busy ? 'Creating…' : 'Create Session'}
          </button>
        </form>
      </Card>

      <section>
        <h2 className="display text-[19px]">Sessions</h2>
        {sessions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No sessions yet" body="Sessions you create above will show up here." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {sessions.map((s) => {
              const regs = registrationsBySession[s.id] ?? [];
              const paid = regs.filter((r) => r.status === 'paid');
              const refunded = regs.filter((r) => r.status === 'refunded');
              return (
                <Card key={s.id} className={`p-4 ${s.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-white">{s.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-silver-dim">{formatWhen(s.startAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-white">{centsToDisplay(s.priceCents)}</span>
                      {s.status === 'cancelled' ? (
                        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-silver-dim">
                          Cancelled
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3ddc84]">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[12.5px] text-silver-dim">
                    {paid.length} registered
                    {s.capacity !== null ? ` / ${s.capacity} capacity` : ''}
                    {refunded.length > 0 ? ` · ${refunded.length} refunded` : ''}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      className="text-[12.5px] font-semibold text-electric-glow hover:text-electric"
                    >
                      {expanded === s.id ? 'Hide registrations' : 'View registrations'}
                    </button>
                    {s.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => cancelSession(s.id)}
                        disabled={cancelling === s.id}
                        className="text-[12.5px] font-semibold text-[#ff6b85] hover:text-[#ff8fa0] disabled:opacity-50"
                      >
                        {cancelling === s.id ? 'Cancelling…' : 'Cancel & Refund Everyone'}
                      </button>
                    )}
                  </div>
                  {expanded === s.id && (
                    <div className="mt-3 grid gap-1.5 border-t border-white/[.08] pt-3">
                      {regs.length === 0 ? (
                        <p className="text-[12.5px] text-silver-dim">No registrations yet.</p>
                      ) : (
                        regs.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-[13px]">
                            <span className="text-white">{r.memberName}</span>
                            <span
                              className={
                                r.status === 'refunded' ? 'text-silver-dim' : 'text-[#3ddc84]'
                              }
                            >
                              {r.status === 'refunded' ? 'Refunded' : 'Paid'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
