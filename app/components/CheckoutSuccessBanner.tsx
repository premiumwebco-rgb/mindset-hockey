'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The state the server was able to prove when the page rendered.
 *
 *  active     — paid AND the webhook has already applied entitlement. Done.
 *  pending    — paid, but profiles.subscription_active is still false. This is
 *               the normal webhook lag window, usually a second or two. It is
 *               NOT a failure and must never be presented as one.
 *  unpaid     — Stripe says this session was not paid.
 *  unverified — Stripe could not be reached, or the session is not this
 *               member's. Say nothing alarming; point at billing.
 */
export type CheckoutState = 'active' | 'pending' | 'unpaid' | 'unverified';

const POLL_MS = 2000;
const GIVE_UP_MS = 30000;

export default function CheckoutSuccessBanner({
  state,
  planName,
}: {
  state: CheckoutState;
  planName?: string | null;
}) {
  const router = useRouter();
  const [waited, setWaited] = useState(0);

  const polling = state === 'pending' && waited < GIVE_UP_MS;

  // Re-render the server component until entitlement lands. router.refresh()
  // re-runs the page's server code, which re-reads profiles.subscription_active
  // — so `state` arrives as 'active' on the pass after the webhook commits.
  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(() => {
      setWaited((w) => w + POLL_MS);
      router.refresh();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [polling, waited, router]);

  if (state === 'unpaid') {
    return (
      <Box tone="amber">
        <Title>Payment wasn&apos;t completed</Title>
        <p className="mt-1.5 text-[14px] text-silver">
          Nothing has been charged. You can{' '}
          <a href="/upgrade" className="text-electric-glow underline underline-offset-4">
            pick your plan again
          </a>{' '}
          whenever you&apos;re ready.
        </p>
      </Box>
    );
  }

  if (state === 'unverified') {
    return (
      <Box tone="amber">
        <Title>We couldn&apos;t confirm that payment just now</Title>
        <p className="mt-1.5 text-[14px] text-silver">
          If you completed checkout, your membership is safe — this is only a display issue.
          Check{' '}
          <a href="/account" className="text-electric-glow underline underline-offset-4">
            Account &amp; billing
          </a>{' '}
          in a moment, or email braydencastiglia@gmail.com and we&apos;ll sort it out.
        </p>
      </Box>
    );
  }

  if (state === 'pending') {
    const timedOut = waited >= GIVE_UP_MS;
    return (
      <Box tone="electric">
        <Title>Payment received{planName ? ` — ${planName}` : ''}</Title>
        <p className="mt-1.5 text-[14px] text-silver">
          {timedOut
            ? 'Your payment went through. Activating the membership is taking longer than usual — it will land shortly. Refresh this page, or check Account & billing in a few minutes.'
            : 'Thank you. We are activating your membership now — this usually takes a few seconds.'}
        </p>
        {!timedOut && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-silver-dim">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-electric border-t-transparent"
            />
            Confirming…
          </p>
        )}
      </Box>
    );
  }

  return (
    <Box tone="green">
      <Title>You&apos;re in{planName ? ` — ${planName}` : ''}</Title>
      <p className="mt-1.5 text-[14px] text-silver">
        Payment confirmed and your membership is active. Finish the short setup below and your
        first week gets built from it.
      </p>
    </Box>
  );
}

/* ---- presentation ------------------------------------------------------- */

function Box({ tone, children }: { tone: 'green' | 'electric' | 'amber'; children: React.ReactNode }) {
  const cls = {
    green: 'border-[#3ddc84]/40 bg-[#3ddc84]/[.07]',
    electric: 'border-electric/40 bg-electric/[.07]',
    amber: 'border-amber/40 bg-amber/[.07]',
  }[tone];

  return (
    <div role="status" aria-live="polite" className={`mb-6 rounded-2xl border p-5 ${cls}`}>
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="display text-[17px] text-white">{children}</p>;
}
