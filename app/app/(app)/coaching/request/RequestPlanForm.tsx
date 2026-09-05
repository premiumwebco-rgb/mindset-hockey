'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CUSTOM_COACHING_SERVICES, STANDARD_MEMBERSHIP_FEATURES } from '@/lib/permissions';
import { priceCustomPlan, centsToDisplay } from '@/lib/customPlan';

export default function RequestPlanForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const standardKeySet = useMemo(
    () => new Set(STANDARD_MEMBERSHIP_FEATURES.map((s) => s.key as string)),
    []
  );
  const personalizedKeySet = useMemo(
    () => new Set(CUSTOM_COACHING_SERVICES.map((s) => s.key)),
    []
  );

  // Live price preview. This is the SAME pricing function the server calls
  // when the "Continue to Checkout" button actually opens a Stripe session —
  // see priceCustomPlan()'s doc comment in lib/customPlan.ts for why that
  // sharing is safe: the server never trusts what this preview shows, it
  // recomputes independently from the selected keys.
  const price = useMemo(() => {
    const standardKeys = [...selected].filter((k) => standardKeySet.has(k));
    const personalizedKeys = [...selected].filter((k) => personalizedKeySet.has(k));
    return priceCustomPlan(standardKeys, personalizedKeys);
  }, [selected, standardKeySet, personalizedKeySet]);

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
      setError('Select at least one option you’re interested in.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Standard and Personalized selections are submitted together, through
      // the exact same request shape the API/table already expected — the
      // two columns below are a display split only, key namespaces already
      // don't collide (MEMBERSHIP_PERMISSIONS vs. CUSTOM_COACHING_SERVICES
      // keys), so no backend change was needed for this.
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

  async function checkout() {
    if (price.totalCents <= 0) {
      setCheckoutError('Select at least one option before checking out.');
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      // The server recomputes this price itself from these keys — see
      // app/api/stripe/custom-plan/checkout/route.ts. Nothing about amount is
      // ever read from this request body.
      const res = await fetch('/api/stripe/custom-plan/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          standardKeys: price.standardKeys,
          personalizedKeys: price.personalizedKeys,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "We couldn't start that checkout. You were not charged.");
      }
      window.location.href = json.url;
    } catch (err) {
      setCheckoutError((err as Error).message);
      setCheckoutBusy(false);
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
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-silver-dim">
            Standard Options
          </p>
          <p className="mb-3 text-[12px] text-silver-dim">
            $24/mo for the first, +$5/mo each additional — 6 selected matches the full $49/mo
            Membership.
          </p>
          <div className="grid gap-3">
            {STANDARD_MEMBERSHIP_FEATURES.map((s) => {
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
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-right text-[13px] font-semibold text-silver">
            Standard subtotal: {centsToDisplay(price.standardCents)}/mo
          </p>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-silver-dim">
            Personalized Options
          </p>
          <p className="mb-3 text-[12px] text-silver-dim">
            Meal Plan and Workout Plan are each a flat $40/mo. Every other option is $100/mo for
            the first, +$20/mo each additional.
          </p>
          <div className="grid gap-3">
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
          <p className="mt-3 text-right text-[13px] font-semibold text-silver">
            Personalized subtotal: {centsToDisplay(price.personalizedCents)}/mo
          </p>
        </div>
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

      {/* Your Custom Plan — combined price + primary checkout action. */}
      <div className="mt-6 rounded-xl border border-electric/40 bg-electric/[.06] p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-silver-dim">
          Your Custom Plan
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <b className="display text-[32px] leading-none text-white">
            {centsToDisplay(price.totalCents)}
          </b>
          <span className="text-[13px] font-semibold text-silver-dim">/ month</span>
        </div>
        <p className="mt-1 text-[12.5px] text-silver-dim">
          {price.standardKeys.length + price.personalizedKeys.length === 0
            ? 'Select at least one option above to see your price.'
            : `${centsToDisplay(price.standardCents)} Standard + ${centsToDisplay(price.personalizedCents)} Personalized`}
        </p>

        {checkoutError && <p className="mt-3 text-[13px] text-[#ff6b85]">{checkoutError}</p>}

        <button
          type="button"
          onClick={checkout}
          disabled={checkoutBusy || price.totalCents <= 0}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[15px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-50 sm:w-auto"
        >
          {checkoutBusy ? 'Opening checkout…' : 'Continue to Checkout'}
        </button>
      </div>

      {error && <p className="mt-3 text-[13px] text-[#ff6b85]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-white/[.14] px-6 py-3 text-[14px] font-semibold text-silver transition-colors hover:border-white/30 disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Not ready to pay yet? Submit as a request instead'}
      </button>
    </form>
  );
}
