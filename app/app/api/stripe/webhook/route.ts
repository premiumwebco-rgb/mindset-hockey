import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import type { Tier, SubscriptionStatus } from '@/lib/types';
import { ACTIVE_SUB_STATUSES } from '@/lib/types';
import { ANALYSIS_ADDON } from '@/lib/plans';

export const runtime = 'nodejs';
/** Stripe needs the raw body for signature verification — never cache. */
export const dynamic = 'force-dynamic';

const RELEVANT = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

function tierFromMetadata(meta: Stripe.Metadata | null | undefined): Tier | null {
  const t = meta?.tier;
  return t === 'basic' || t === 'premium' ? t : null;
}

/**
 * The one-time setup fee in cents, as recorded by the checkout route after it
 * verified the price is genuinely non-recurring. Returns null when absent or
 * unparseable so a bad value is never written to `subscriptions`.
 */
function setupFeeFromMetadata(meta: Stripe.Metadata | null | undefined): number | null {
  const raw = meta?.setup_fee_amount;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Stripe's subscription status enum has two values we don't model
 * (`incomplete_expired`, `paused`) — both mean "no active access," so they
 * fold into `canceled` rather than being cast past the type system.
 */
function normalizeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'incomplete_expired' || status === 'paused') return 'canceled';
  return status;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // Signature failure means the request did not come from Stripe. Reject.
    console.error('[stripe] signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!RELEVANT.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const admin = await createAdminClient();

  // Idempotency: Stripe retries. Insert-first means a duplicate delivery
  // collides on the primary key and exits before touching entitlements.
  const { error: dupeError } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type, payload: event as unknown as object });

  if (dupeError) {
    if (dupeError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe] could not record event:', dupeError.message);
    return NextResponse.json({ error: 'Event log write failed' }, { status: 500 });
  }

  try {
    await handleEvent(event, admin);
  } catch (err) {
    console.error(`[stripe] handler failed for ${event.type}:`, err);
    // Remove the ledger row so Stripe's retry can have another go.
    await admin.from('stripe_events').delete().eq('id', event.id);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

async function handleEvent(event: Stripe.Event, admin: Admin) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;

      // A one-time add-on purchase is NOT a membership change. Branch before
      // any subscription logic so it can never touch profiles.tier or
      // subscription_active.
      if (cs.metadata?.kind === 'analysis_addon') {
        await grantAnalysisAddon(admin, event, cs);
        return;
      }

      const profileId = cs.client_reference_id ?? cs.metadata?.profile_id;
      const tier = tierFromMetadata(cs.metadata);
      if (!profileId || !tier) {
        console.warn('[stripe] checkout.session.completed without profile/tier metadata');
        return;
      }

      // Pull the subscription so we store real period dates, not guesses.
      const subId =
        typeof cs.subscription === 'string' ? cs.subscription : cs.subscription?.id;
      let sub: Stripe.Subscription | null = null;
      if (subId) sub = await stripe().subscriptions.retrieve(subId);

      await upsertSubscription(admin, {
        profileId,
        tier,
        customerId: String(cs.customer),
        sub,
        setupFeePaid: true,
        // NOT cs.amount_total — that is the whole first invoice (setup fee PLUS
        // the first month, e.g. $349 for Standard). The checkout route puts the
        // verified one-time price amount in metadata; fall back to null rather
        // than recording a number we know to be wrong.
        setupFeeAmount: setupFeeFromMetadata(cs.metadata),
      });

      await applyEntitlement(admin, profileId, tier, sub ? normalizeStatus(sub.status) : 'active');

      await admin
        .from('profiles')
        .update({ setup_fee_paid_at: new Date().toISOString() })
        .eq('id', profileId)
        .is('setup_fee_paid_at', null);
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const snapshot = event.data.object as Stripe.Subscription;

      /* ------------------------------------------------------------------
         Stripe delivers the events for a single checkout concurrently, and
         they are NOT guaranteed to be processed in the order they occurred.
         `event.data.object` is a point-in-time SNAPSHOT taken when the event
         was created, so a slow-delivered `incomplete` snapshot can arrive
         after a `trialing` one and overwrite it — revoking a paying member's
         access. This was observed in production: audit_log recorded
         `entitlement.granted {status: trialing}` immediately followed by
         `entitlement.revoked {status: incomplete}` for the same paid
         subscription, leaving the member locked out.

         Re-reading the subscription from Stripe makes every handler decide
         from current truth instead of its own stale snapshot, so concurrent
         out-of-order deliveries converge on the same correct result rather
         than fighting each other. A `deleted` event is authoritative on its
         own and is deliberately NOT re-read — the row may already be gone.
      ------------------------------------------------------------------ */
      const sub =
        event.type === 'customer.subscription.deleted'
          ? snapshot
          : await stripe().subscriptions.retrieve(snapshot.id);

      const profileId = await resolveProfileId(admin, sub);
      if (!profileId) return;

      const tier = tierFromMetadata(sub.metadata) ?? (await currentTier(admin, profileId));
      if (!tier) return;

      const status: SubscriptionStatus =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : normalizeStatus(sub.status);

      await upsertSubscription(admin, {
        profileId,
        tier,
        customerId: String(sub.customer),
        sub,
        statusOverride: status,
      });
      await applyEntitlement(admin, profileId, tier, status);
      return;
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      const subId =
        typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
      if (!subId) return;
      const sub = await stripe().subscriptions.retrieve(subId);
      const profileId = await resolveProfileId(admin, sub);
      if (!profileId) return;
      const tier = tierFromMetadata(sub.metadata) ?? (await currentTier(admin, profileId));
      if (!tier) return;

      await upsertSubscription(admin, {
        profileId,
        tier,
        customerId: String(sub.customer),
        sub,
      });
      await applyEntitlement(admin, profileId, tier, normalizeStatus(sub.status));
      return;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const subId =
        typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
      if (!subId) return;
      const sub = await stripe().subscriptions.retrieve(subId);
      const profileId = await resolveProfileId(admin, sub);
      if (!profileId) return;

      // Stripe moves the sub to past_due / unpaid itself; mirror it and revoke.
      await admin
        .from('subscriptions')
        .update({ status: sub.status, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);

      await applyEntitlement(
        admin,
        profileId,
        (await currentTier(admin, profileId)) ?? 'none',
        normalizeStatus(sub.status)
      );
      return;
    }
  }
}

/**
 * Banks ONE paid AI Shot Analysis after Stripe confirms payment.
 *
 * THE ONLY PLACE A PURCHASED ENTITLEMENT IS EVER CREATED. Reaching it requires
 * a signature-verified Stripe event — a client redirect, a replayed success
 * URL or a crafted API call cannot produce one.
 *
 * IDEMPOTENCY IS THE DATABASE'S JOB. `stripe_event_id` and `stripe_session_id`
 * are both UNIQUE in `analysis_purchases`, so a duplicate delivery loses to a
 * unique violation (23505) rather than granting a second analysis. That holds
 * even for simultaneous deliveries, which an application-level "check then
 * insert" would not.
 *
 * QUANTITY AND AMOUNT COME FROM STRIPE AND FROM OUR OWN PRODUCT DEFINITION,
 * never from metadata a client could have influenced.
 */
async function grantAnalysisAddon(
  admin: Admin,
  event: Stripe.Event,
  cs: Stripe.Checkout.Session
): Promise<void> {
  // Only a genuinely paid session grants anything. Unpaid, async-pending and
  // cancelled sessions fall through and bank nothing.
  if (cs.payment_status !== 'paid') {
    console.warn(`[addon] session ${cs.id} is ${cs.payment_status}, not granting`);
    return;
  }

  const profileId = cs.client_reference_id ?? cs.metadata?.profile_id;
  if (!profileId) {
    console.error(`[addon] session ${cs.id} has no profile reference — cannot grant`);
    return;
  }

  // Trust Stripe's own line items over anything in metadata.
  let quantity = 0;
  try {
    const items = await stripe().checkout.sessions.listLineItems(cs.id, { limit: 10 });
    for (const item of items.data) {
      if (item.price?.id === ANALYSIS_ADDON.priceId) quantity += item.quantity ?? 0;
    }
  } catch (err) {
    console.error('[addon] could not read line items:', (err as Error).message);
    return;
  }

  if (quantity <= 0) {
    console.error(`[addon] session ${cs.id} contained no add-on line item — not granting`);
    return;
  }

  const { error } = await admin.from('analysis_purchases').insert({
    profile_id: profileId,
    stripe_event_id: event.id,
    stripe_session_id: cs.id,
    stripe_payment_intent_id:
      typeof cs.payment_intent === 'string' ? cs.payment_intent : (cs.payment_intent?.id ?? null),
    quantity,
    amount_cents: cs.amount_total ?? ANALYSIS_ADDON.amountCents * quantity,
    currency: cs.currency ?? ANALYSIS_ADDON.currency,
  });

  if (error) {
    // 23505 = unique violation = this payment was already banked. Expected on
    // a Stripe retry, and precisely the behavior we want.
    if (error.code === '23505') {
      console.log(`[addon] session ${cs.id} already granted — duplicate ignored`);
      return;
    }
    // Anything else must surface so Stripe retries rather than losing a
    // purchase the member has paid for.
    throw new Error(`could not record analysis purchase: ${error.message}`);
  }

  console.log(`[addon] granted ${quantity} analysis to ${profileId} (session ${cs.id})`);
}

/** Finds the profile behind a subscription, via metadata then customer id. */
async function resolveProfileId(admin: Admin, sub: Stripe.Subscription) {
  const fromMeta = sub.metadata?.profile_id;
  if (fromMeta) return fromMeta;

  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', String(sub.customer))
    .maybeSingle();

  if (!data) console.warn('[stripe] no profile for customer', sub.customer);
  return data?.id ?? null;
}

async function currentTier(admin: Admin, profileId: string): Promise<Tier | null> {
  const { data } = await admin.from('profiles').select('tier').eq('id', profileId).single();
  return (data?.tier as Tier) ?? null;
}

async function upsertSubscription(
  admin: Admin,
  args: {
    profileId: string;
    tier: Tier;
    customerId: string;
    sub: Stripe.Subscription | null;
    statusOverride?: SubscriptionStatus;
    setupFeePaid?: boolean;
    setupFeeAmount?: number | null;
  }
) {
  const { profileId, tier, customerId, sub } = args;
  const status = args.statusOverride ?? (sub ? normalizeStatus(sub.status) : 'incomplete');

  const row: Record<string, unknown> = {
    profile_id: profileId,
    stripe_customer_id: customerId,
    tier,
    status,
    updated_at: new Date().toISOString(),
  };

  if (sub) {
    row.stripe_subscription_id = sub.id;
    row.stripe_price_id = sub.items.data[0]?.price?.id ?? null;
    row.current_period_end = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
    row.cancel_at_period_end = sub.cancel_at_period_end ?? false;
  }
  if (args.setupFeePaid !== undefined) row.setup_fee_paid = args.setupFeePaid;
  if (args.setupFeeAmount != null) row.setup_fee_amount = args.setupFeeAmount;

  if (sub) {
    await admin.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' });
  } else {
    await admin.from('subscriptions').insert(row);
  }
}

/**
 * The one place entitlement is granted or revoked.
 * Anything other than trialing/active drops `subscription_active` to false,
 * which the RLS function `auth_has_tier()` reads — so premium rows become
 * unreadable the moment a payment fails.
 */
async function applyEntitlement(
  admin: Admin,
  profileId: string,
  tier: Tier,
  status: SubscriptionStatus
) {
  const active = ACTIVE_SUB_STATUSES.includes(status);

  // `tier` is written unconditionally and `subscription_active` carries the
  // entitlement. On cancellation the tier LABEL is deliberately retained while
  // subscription_active flips false, so /account can still say "Premium —
  // Inactive" and offer a reactivate CTA. Access is unaffected: both
  // hasTier() in lib/session.ts and auth_has_tier() in the RLS policies
  // require subscription_active, not just the label.
  await admin
    .from('profiles')
    .update({
      tier,
      subscription_active: active,
    })
    .eq('id', profileId);

  await admin.from('audit_log').insert({
    actor_id: null,
    action: active ? 'entitlement.granted' : 'entitlement.revoked',
    target_table: 'profiles',
    target_id: profileId,
    meta: { tier, status },
  });
}
