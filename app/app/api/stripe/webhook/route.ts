import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import type { Tier, SubscriptionStatus } from '@/lib/types';
import { ACTIVE_SUB_STATUSES } from '@/lib/types';

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
        setupFeeAmount: cs.amount_total ?? null,
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
      const sub = event.data.object as Stripe.Subscription;
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

  await admin
    .from('profiles')
    .update({
      tier: active ? tier : tier, // keep the label so the UI can offer a reactivate CTA
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
