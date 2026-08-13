'use client';

import { useState } from 'react';

export default function CheckoutButton({
  plan,
  featured,
  children,
}: {
  plan: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start checkout.');
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
        className={[
          'inline-flex w-full items-center justify-center rounded-[10px] px-6 py-3.5 text-[15px] font-bold transition-all disabled:opacity-50',
          featured
            ? 'bg-electric text-white shadow-[0_8px_30px_rgba(10,132,255,.32)] hover:bg-electric-glow'
            : 'border border-white/[.14] text-white hover:border-electric hover:bg-electric/10',
        ].join(' ')}
      >
        {busy ? 'Opening checkout…' : children}
      </button>
      {error && <p className="mt-2 text-[13px] text-[#ff6b85]">{error}</p>}
    </div>
  );
}
