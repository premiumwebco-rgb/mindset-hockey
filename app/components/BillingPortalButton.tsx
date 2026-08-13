'use client';

import { useState } from 'react';

export default function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open billing.');
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-50"
      >
        {busy ? 'Opening…' : 'Manage Billing'}
      </button>
      {error && <p className="mt-2 text-[13px] text-[#ff6b85]">{error}</p>}
    </div>
  );
}
