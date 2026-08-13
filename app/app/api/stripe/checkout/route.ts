import { NextResponse } from 'next/server';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { PLAN_BY_SLUG } from '@/lib/plans';

export const runtime = 'nodejs';

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

  const plan = PLAN_BY_SLUG[body.plan ?? ''];
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
    metadata: { profile_id: session.userId, tier: plan.tier, plan: plan.slug },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    success_url: `${siteUrl()}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/upgrade?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
