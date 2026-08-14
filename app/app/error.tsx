'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * Without this file Next.js renders its own error screen, which in production
 * shows a bare "Application error: a client-side exception has occurred" and in
 * development shows a full stack trace. Neither is acceptable for a paying
 * customer who was halfway through checkout.
 *
 * The real error is logged to the server console via console.error, where the
 * hosting platform captures it. Nothing about the failure — message, stack,
 * table names, Stripe or Supabase internals — is rendered to the visitor. The
 * digest is a Next.js-generated hash, safe to show and useful for support.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="w-full max-w-[520px] text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-2 text-[clamp(26px,5vw,38px)]">That page didn&apos;t load</h1>
        <p className="mt-3 text-[15px] text-silver-dim">
          The problem is on our side, not yours. Nothing you were doing has been lost, and if you
          were part-way through a payment you have not been charged twice.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-electric-glow"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-[10px] border border-white/[.14] px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:border-electric"
          >
            Go to dashboard
          </Link>
        </div>

        <p className="mt-8 text-[13px] text-silver-dim">
          Still stuck? Email{' '}
          <a href="mailto:braydencastiglia@gmail.com" className="text-electric-glow underline underline-offset-4">
            braydencastiglia@gmail.com
          </a>{' '}
          or call (240) 435-6511.
          {error.digest && (
            <>
              <br />
              <span className="text-silver-dim/70">Reference: {error.digest}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
