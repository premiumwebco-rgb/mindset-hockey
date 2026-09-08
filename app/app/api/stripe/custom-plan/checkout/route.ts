import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { priceCustomPlan } from '@/lib/customPlan';

export const runtime = 'nodejs';

/**
 * Opens a Stripe Checkout session for a Custom Plan (the Standard +
 * Personalized options selected on /coaching/request).
 *
 * Reuses the exact customer-reuse / Stripe-mode-boundary handling from
 * app/api/stripe/checkout/route.ts rather than inventing a new Stripe
 * architecture — the only genuinely new piece is the price, and that is
 * computed here, never trusted from the client, via lib/customPlan.ts's
 * priceCustomPlan() — the SAME function RequestPlanForm.tsx calls for its
 * live preview, so there is exactly one place "what does this cost" is
 * defined. If a request body ever included an amount/price field it would be
 * ignored entirely; only the option KEYS are read from it.
 *
 * NOTHING IS GRANTED HERE. Same rule as /api/analysis/purchase: this route
 * only opens a Checkout Session. The entitlement (both the
 * custom_plan_purchases record and the actual permission columns) is created
 * solely by the webhook, after Stripe confirms payment — see
 * grantCustomPlan() in app/api/stripe/webhook/route.ts. Opening checkout,
 * abandoning it, or replaying the success URL grants nothing.
 *
 * Uses `mode: 'subscription'` with inline `price_data` (ad-hoc recurring
 * prices) rather than pre-created per-option Stripe Prices — the Custom
 * Plan's price is computed from an open-ended combination of options, so a
 * fixed Stripe Price per combination is not practical, and Stripe's
 * `price_data` on a subscription-mode Checkout Session supports exactly this
 * "recurring amount decided by the platform, not pre-priced in the
 * dashboard" case. This produces a SEPARATE subscription from the base
 * Mindset Hockey Membership subscription (if the member also has one) — the
 * two are billed and tracked independently, mirroring how the one-time
 * Analysis add-on is deliberately kept out of the membership subscription.
 */
export async function POST(req: Request) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Checkout is disabled in demo mode. Configure Supabase and Stripe first.' },
      { status: 503 }
    );
  }

  const session = await requireSession();

  let body: { standardKeys?: unknown; personalizedKeys?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const standardKeysIn = Array.isArray(body.standardKeys)
    ? body.standardKeys.filter((k): k is string => typeof k === 'string')
    : [];
  const personalizedKeysIn = Array.isArray(body.personalizedKeys)
    ? body.personalizedKeys.filter((k): k is string => typeof k === 'string')
    : [];

  // THE server-side price. Nothing the client sent about amount is read.
  const { standardKeys, personalizedKeys, standardCents, personalizedCents, totalCents } =
    priceCustomPlan(standardKeysIn, personalizedKeysIn);

  if (totalCents <= 0) {
    return NextResponse.json(
      { error: 'Select at least one option before checking out.' },
      { status: 400 }
    );
  }

  const s = stripe();

  // ---- reuse the member's existing Stripe customer ------------------------
  // Identical mode-boundary handling to app/api/stripe/checkout/route.ts: a
  // stored customer id from the other Stripe mode (test/live) is dropped and
  // replaced rather than trusted blindly.
  const { createAdminClient } = await import('@/lib/supabase/server');
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', session.userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (customerId) {
    try {
      const existing = await s.customers.retrieve(customerId);
      if ((existing as Stripe.DeletedCustomer).deleted) customerId = undefined;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'resource_missing') {
        console.warn(
          `[stripe] stored customer ${customerId} does not exist in this Stripe mode — reconnecting billing for profile ${session.userId}`
        );
        customerId = undefined;
      } else {
        throw err;
      }
    }
  }

  if (!customerId) {
    const found = await s.customers.list({ email: session.email, limit: 1 });
    const customer =
      found.data[0] ??
      (await s.customers.create({
        email: session.email,
        name: session.fullName || undefined,
        metadata: { profile_id: session.userId },
      }));

    customerId = customer.id;
    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', session.userId);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (standardCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: standardCents,
        recurring: { interval: 'month' },
        product_data: { name: 'Custom Plan — Standard Options' },
      },
      quantity: 1,
    });
  }
  if (personalizedCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: personalizedCents,
        recurring: { interval: 'month' },
        product_data: { name: 'Mindset Hockey — Custom Plan' },
      },
      quantity: 1,
    });
  }

  // Metadata mirrored onto both the session and the subscription (same
  // pattern as app/api/stripe/checkout/route.ts) so the webhook can act on
  // whichever object a given event carries. `kind: 'custom_plan'` is what
  // lets the webhook branch this away from the base Membership path AND away
  // from the analysis add-on path, before any subscription/tier logic runs.
  const metadata: Record<string, string> = {
    profile_id: session.userId,
    kind: 'custom_plan',
    standard_keys: JSON.stringify(standardKeys),
    personalized_keys: JSON.stringify(personalizedKeys),
    standard_amount_cents: String(standardCents),
    personalized_amount_cents: String(personalizedCents),
  };

  const checkout = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: session.userId,
    line_items: lineItems,
    subscription_data: { metadata },
    metadata,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    success_url: `${siteUrl()}/custom?checkout=success`,
    cancel_url: `${siteUrl()}/custom?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
