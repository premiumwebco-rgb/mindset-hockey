import { NextResponse } from 'next/server';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Opens the Stripe customer portal so members can manage or cancel billing. */
export async function POST() {
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Billing portal is disabled in demo mode.' }, { status: 503 });
  }

  const session = await requireSession();
  const admin = await createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', session.userId)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account yet.' }, { status: 400 });
  }

  /* ------------------------------------------------------------------------
     STRIPE MODE BOUNDARY

     Same hazard as the checkout route: a customer id stored under a different
     Stripe mode will not resolve. The portal deliberately does NOT create a
     replacement customer — opening a billing portal is not a purchase, and
     minting a customer on every portal click would litter duplicates. Instead
     the stale reference is cleared so the next checkout starts clean, and the
     member gets a plain-language message rather than a Stripe stack trace.

     Only `resource_missing` is handled this way. Every other Stripe error is
     re-thrown so genuine failures stay visible.
  ------------------------------------------------------------------------ */
  let portal;
  try {
    portal = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/account`,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'resource_missing') throw err;

    console.warn(
      `[stripe] portal: stored customer ${profile.stripe_customer_id} does not exist in this Stripe mode — clearing for profile ${session.userId}`
    );
    await admin
      .from('profiles')
      .update({ stripe_customer_id: null })
      .eq('id', session.userId);

    return NextResponse.json(
      {
        error:
          'We need to reconnect your billing account. Please start a plan from the upgrade page and this will resolve itself.',
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ url: portal.url });
}
