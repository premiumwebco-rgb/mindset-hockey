import { NextResponse } from 'next/server';
import { stripe, siteUrl } from '@/lib/stripe';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Opens a Stripe Checkout session for ONE Group Coaching Session
 * registration.
 *
 * WHAT THE CLIENT MAY DECIDE: only which session id. The price is never
 * trusted from the client — it is read straight off the session's own
 * price_cents column (set by an admin when the session was created, see
 * app/api/admin/group-sessions/route.ts) immediately before the Checkout
 * Session is created.
 *
 * mode: 'payment' — a one-time charge, not a subscription, same shape as
 * the AI Shot Analysis add-on (app/api/analysis/purchase/route.ts).
 *
 * NOTHING IS GRANTED/REGISTERED HERE. This route only opens a Checkout
 * Session. The group_session_registrations row is created solely by the
 * webhook after Stripe confirms payment — see grantGroupSessionRegistration()
 * in app/api/stripe/webhook/route.ts. Opening checkout, abandoning it, or
 * replaying the success URL registers nothing.
 */
export async function POST(req: Request) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Checkout is disabled in demo mode. Configure Supabase and Stripe first.' },
      { status: 503 }
    );
  }

  const session = await requireSession();

  let body: { sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const groupSessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
  if (!groupSessionId) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  const { data: groupSession } = await admin
    .from('group_coaching_sessions')
    .select('id, title, start_at, price_cents, capacity, status')
    .eq('id', groupSessionId)
    .single();

  if (!groupSession) {
    return NextResponse.json({ error: 'That session no longer exists.' }, { status: 404 });
  }
  if (groupSession.status !== 'scheduled') {
    return NextResponse.json({ error: 'That session has been cancelled.' }, { status: 409 });
  }
  if (new Date(groupSession.start_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'That session has already happened.' }, { status: 409 });
  }

  // Already registered? Don't let a member pay twice — the DB unique
  // constraint (session_id, profile_id) is the hard backstop, this is just
  // a friendlier error before Stripe is ever involved.
  const { data: existing } = await admin
    .from('group_session_registrations')
    .select('id, status')
    .eq('session_id', groupSessionId)
    .eq('profile_id', session.userId)
    .maybeSingle();
  if (existing?.status === 'paid') {
    return NextResponse.json({ error: "You're already registered for this session." }, { status: 409 });
  }

  // Best-effort capacity check before opening checkout — re-checked again in
  // the webhook (see grantGroupSessionRegistration()), which is the actual
  // enforcement point since two members could pass this check concurrently.
  if (groupSession.capacity !== null) {
    const { count } = await admin
      .from('group_session_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', groupSessionId)
      .eq('status', 'paid');
    if ((count ?? 0) >= groupSession.capacity) {
      return NextResponse.json({ error: 'That session is full.' }, { status: 409 });
    }
  }

  const priceCents = Number(groupSession.price_cents);
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return NextResponse.json({ error: 'That session is not available for registration.' }, { status: 503 });
  }

  const s = stripe();

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
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', session.userId);
  }

  const checkout = await s.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: session.userId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          product_data: { name: `Group Coaching — ${groupSession.title}` },
        },
        quantity: 1,
      },
    ],
    // `kind` is what the webhook keys off to tell this apart from every
    // other checkout type. `group_session_id`/`profile_id` are written from
    // the server, not from anything a forged body could redirect.
    metadata: {
      kind: 'group_session',
      profile_id: session.userId,
      group_session_id: groupSessionId,
      amount_cents: String(priceCents),
    },
    success_url: `${siteUrl()}/coaching/signup?checkout=success`,
    cancel_url: `${siteUrl()}/coaching/signup?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
