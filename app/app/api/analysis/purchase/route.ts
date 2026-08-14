import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, canUse, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { ANALYSIS_ADDON } from '@/lib/plans';

export const runtime = 'nodejs';

/**
 * Buys ONE additional AI Shot Analysis.
 *
 * WHAT THE CLIENT MAY DECIDE: nothing.
 *
 * The body is ignored entirely. Price, amount, currency, quantity and the
 * owning user are all determined here, server-side:
 *   - the user comes from the authenticated session, never from a body field
 *   - the price id comes from the environment, never from the request
 *   - the amount is verified against ANALYSIS_ADDON before a session exists
 *
 * NOTHING IS GRANTED HERE. This route only opens a Stripe Checkout Session.
 * The entitlement is created solely by the webhook, after Stripe has confirmed
 * payment and the signature has been verified. Opening checkout, abandoning
 * it, or replaying the success URL grants nothing.
 */
export async function POST() {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Purchases are disabled in demo mode.' },
      { status: 503 }
    );
  }

  // Must be a signed-in member entitled to the feature at all. Buying an
  // add-on is not a way around having a membership.
  const session = await requireSession();
  if (!canUse(session, 'ai_shot_analysis')) {
    return NextResponse.json(
      { error: 'AI Shot Analysis is included with the Standard and Premium programs.' },
      { status: 403 }
    );
  }

  if (!ANALYSIS_ADDON.priceId) {
    console.error('[purchase] NEXT_PUBLIC_STRIPE_PRICE_ANALYSIS_ADDON is not set');
    return NextResponse.json(
      { error: 'Additional analyses are not available right now.' },
      { status: 503 }
    );
  }

  const s = stripe();

  // ---- verify the configured price really is the $0.50 one-time product ----
  // Guards against a mis-pasted price id pointing at a subscription or a
  // different amount. The member must never be charged something other than
  // the advertised price.
  let price: Stripe.Price;
  try {
    price = await s.prices.retrieve(ANALYSIS_ADDON.priceId);
  } catch (err) {
    console.error('[purchase] could not read add-on price:', (err as Error).message);
    return NextResponse.json(
      { error: 'Additional analyses are not available right now.' },
      { status: 503 }
    );
  }

  const problems: string[] = [];
  if (!price.active) problems.push('price is archived');
  if (price.recurring) problems.push('price is recurring, must be one-time');
  if (price.currency !== ANALYSIS_ADDON.currency) {
    problems.push(`currency is ${price.currency}, expected ${ANALYSIS_ADDON.currency}`);
  }
  if (price.unit_amount !== ANALYSIS_ADDON.amountCents) {
    problems.push(`amount is ${price.unit_amount}, expected ${ANALYSIS_ADDON.amountCents}`);
  }

  if (problems.length) {
    // Detail to the operator, not to the member.
    console.error(`[purchase] refusing to sell add-on — ${problems.join('; ')}`);
    return NextResponse.json(
      { error: 'Additional analyses are not available right now.' },
      { status: 503 }
    );
  }

  // ---- reuse the member's existing Stripe customer ------------------------
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', session.userId)
    .single();

  let customerId = (profile?.stripe_customer_id as string | undefined) ?? undefined;
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

  // ---- one-time payment, NOT a subscription change -----------------------
  // mode: 'payment' guarantees this cannot alter the member's plan. The
  // webhook additionally refuses to treat it as a subscription event.
  const checkout = await s.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: session.userId,
    line_items: [{ price: ANALYSIS_ADDON.priceId, quantity: ANALYSIS_ADDON.quantity }],
    // `kind` is what the webhook keys off to tell an add-on apart from a
    // membership checkout. `profile_id` is written from the session, so a
    // forged body cannot direct the entitlement at another account.
    metadata: {
      kind: 'analysis_addon',
      profile_id: session.userId,
      quantity: String(ANALYSIS_ADDON.quantity),
    },
    success_url: `${siteUrl()}/analysis/new?purchase=success`,
    cancel_url: `${siteUrl()}/analysis/new?purchase=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
