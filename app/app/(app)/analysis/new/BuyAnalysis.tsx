'use client';

import { useState } from 'react';

/**
 * Buys one additional AI Shot Analysis.
 *
 * Sends NO body. Price, quantity and the owning account are all decided
 * server-side in /api/analysis/purchase — there is nothing here for a user to
 * tamper with, and nothing this component can do grants an entitlement. The
 * analysis only becomes available after Stripe confirms payment and the
 * webhook banks it.
 */
export default function BuyAnalysis({ price }: { price: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis/purchase', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "We couldn't start that purchase. You were not charged.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:opacity-50"
      >
        {busy ? 'Opening checkout…' : `Get 1 more analysis — ${price}`}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff6b85]">
          {error}
        </p>
      )}
    </div>
  );
}
