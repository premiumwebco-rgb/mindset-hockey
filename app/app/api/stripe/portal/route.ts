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

  const portal = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl()}/account`,
  });

  return NextResponse.json({ url: portal.url });
}
