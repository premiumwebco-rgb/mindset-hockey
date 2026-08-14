import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { planFromParam } from '@/lib/plans';

export const runtime = 'nodejs';

const EXPECTED_CURRENCY = 'usd';

/**
 * Guards against the single most expensive misconfiguration available here:
 * creating the setup fee as a RECURRING price in the Stripe dashboard, which
 * would silently bill a family $249 or $389 every single month.
 *
 * Stripe will happily accept that price in a subscription session, so nothing
 * downstream would catch it. These checks run before the session is created
 * and refuse to build one from prices that are not shaped as intended.
 */
function checkPrice(
  price: Stripe.Price,
  expect: 'one_time' | 'recurring',
  label: string
): string | null {
  if (!price.active) {
    return `The ${label} price (${price.id}) is archived in Stripe. Activate it or point the environment variable at a live price.`;
  }
  if (price.currency !== EXPECTED_CURRENCY) {
    return `The ${label} price (${price.id}) is in ${price.currency.toUpperCase()}, but this app bills in ${EXPECTED_CURRENCY.toUpperCase()}.`;
  }
  if (expect === 'one_time' && price.recurring) {
    return `The ${label} price (${price.id}) is configured as RECURRING (every ${price.recurring.interval}). A setup fee must be a ONE-TIME price, or the member would be charged it on every invoice. Recreate it in Stripe as One-time.`;
  }
  if (expect === 'recurring' && !price.recurring) {
    return `The ${label} price (${price.id}) is a one-time price, but the monthly membership must be RECURRING. Recreate it in Stripe as Recurring / monthly.`;
  }
  return null;
}

/**
 * Creates a Stripe Checkout session containing BOTH lines:
 *   - the one-time setup fee
 *   - the recurring monthly subscription
 *
 * Stripe allows mixing a one-time price into a `mode: 'subscription'` session
 * as long as the one-time price is not recurring — it lands on the first
 * invoice. That gives "$600 today, then $200/month" in a single payment.
 */
export async function POST(req: Request) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Checkout is disabled in demo mode. Configure Supabase and Stripe first.' },
      { status: 503 }
    );
  }

  const session = await requireSession();

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Route boundary: the body carries the public slug. planFromParam is the one
  // place it becomes a Plan, so `basic` and `standard` cannot diverge here.
  const plan = planFromParam(body.plan);
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  }
  if (!plan.priceIdMonthly || !plan.priceIdSetup) {
    return NextResponse.json(
      { error: `Stripe price IDs are not configured for the ${plan.name}.` },
      { status: 500 }
    );
  }

  const s = stripe();

  // ---- Verify the configured prices are shaped the way we think ----------
  let monthlyPrice: Stripe.Price;
  let setupPrice: Stripe.Price;
  try {
    [monthlyPrice, setupPrice] = await Promise.all([
      s.prices.retrieve(plan.priceIdMonthly),
      s.prices.retrieve(plan.priceIdSetup),
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not read the Stripe prices for the ${plan.name}. Check the price IDs in your environment. (${(err as Error).message})`,
      },
      { status: 400 }
    );
  }

  const problem =
    checkPrice(setupPrice, 'one_time', `${plan.name} setup fee`) ??
    checkPrice(monthlyPrice, 'recurring', `${plan.name} monthly`);

  if (problem) {
    console.error('[stripe] refusing to create checkout session:', problem);
    return NextResponse.json({ error: problem }, { status: 409 });
  }

  // Reuse the customer if we already have one, so billing history stays intact.
  const { createAdminClient } = await import('@/lib/supabase/server');
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', session.userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await s.customers.create({
      email: session.email,
      name: session.fullName || undefined,
      metadata: { profile_id: session.userId },
    });
    customerId = customer.id;
    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', session.userId);
  }

  const checkout = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: session.userId,
    line_items: [
      { price: plan.priceIdMonthly, quantity: 1 },
      { price: plan.priceIdSetup, quantity: 1 },
    ],
    subscription_data: {
      metadata: { profile_id: session.userId, tier: plan.tier },
    },
    // Mirrored onto the session so the webhook can act on either object.
    // `setup_fee_amount` is the verified one-time price in cents — the webhook
    // records this rather than the session's amount_total, which also contains
    // the first month's subscription charge.
    metadata: {
      profile_id: session.userId,
      tier: plan.tier,
      plan: plan.slug,
      setup_fee_amount: String(setupPrice.unit_amount ?? ''),
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    success_url: `${siteUrl()}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/upgrade?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
