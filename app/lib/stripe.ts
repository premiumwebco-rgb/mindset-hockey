import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Server-only Stripe client. Throws loudly if the key is missing. */
export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  return cached;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

/** What the server could actually prove about a returning checkout session. */
export type CheckoutVerification =
  | { state: 'paid'; planName: string | null }
  | { state: 'processing'; planName: string | null }
  | { state: 'unpaid' }
  | { state: 'unverifiable' };

/**
 * Confirms a Stripe Checkout session really was paid, and really belongs to
 * this member.
 *
 * `?checkout=success` in the URL proves nothing — anyone can type it. Stripe is
 * asked directly, and the session's `client_reference_id` must match the signed
 * in user, so one member cannot claim another's payment by pasting their
 * session id.
 *
 * Never throws: a Stripe outage must not break the page a paying member lands
 * on. It degrades to 'unverifiable', which the UI treats as "probably fine,
 * check back" rather than "payment failed".
 */
export async function verifyCheckoutSession(
  sessionId: string,
  profileId: string
): Promise<CheckoutVerification> {
  try {
    const cs = await stripe().checkout.sessions.retrieve(sessionId);

    const owner = cs.client_reference_id ?? cs.metadata?.profile_id ?? null;
    if (owner !== profileId) {
      console.warn('[stripe] checkout session %s does not belong to %s', sessionId, profileId);
      return { state: 'unverifiable' };
    }

    const planName = cs.metadata?.plan ?? null;

    if (cs.payment_status === 'paid' || cs.payment_status === 'no_payment_required') {
      return { state: 'paid', planName };
    }
    // Some payment methods settle asynchronously; this is not a failure.
    if (cs.status === 'open' || cs.payment_status === 'unpaid') {
      return cs.status === 'complete'
        ? { state: 'processing', planName }
        : { state: 'unpaid' };
    }
    return { state: 'processing', planName };
  } catch (err) {
    console.error('[stripe] could not verify checkout session:', (err as Error).message);
    return { state: 'unverifiable' };
  }
}
