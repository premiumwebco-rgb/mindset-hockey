import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import type { Tier, SubscriptionStatus } from '@/lib/types';
import { ACTIVE_SUB_STATUSES } from '@/lib/types';
import { ANALYSIS_ADDON } from '@/lib/plans';
import { membershipPermissionPatch, MEMBERSHIP_PERMISSIONS, CUSTOM_COACHING_SERVICES } from '@/lib/permissions';
import { priceCustomPlan } from '@/lib/customPlan';

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

/**
 * Reads the tier off Stripe metadata and normalizes it to 'membership'.
 *
 * Existing Stripe subscriptions created under the old Standard/Premium plans
 * carry `metadata.tier = 'basic' | 'premium'` PERMANENTLY — that metadata was
 * set once at subscription creation and this app has no reason to ever
 * rewrite it on the Stripe side (their billing is deliberately left
 * untouched, still at $100/mo or $149/mo). Rather than keep two live tiers
 * around forever, every renewal event normalizes whatever it finds to
 * 'membership' — so a legacy subscriber's `profiles.tier` converges on
 * 'membership' the first time any subscription event fires for them, and
 * applyEntitlement() below grants them the full Membership permission set.
 * New checkouts always set metadata.tier = 'membership' directly.
 */
function tierFromMetadata(meta: Stripe.Metadata | null | undefined): Tier | null {
  const t = meta?.tier;
  return t === 'basic' || t === 'premium' || t === 'membership' ? 'membership' : null;
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

      // A Custom Plan purchase is its OWN subscription, separate from the
      // base Membership one — branch before any of the Membership logic
      // below so it can never be misread as a Membership checkout (it has
      // no `tier` metadata, which would otherwise make `tier` resolve to
      // null and the event get silently ignored — or worse, misapplied).
      if (cs.metadata?.kind === 'custom_plan') {
        await grantCustomPlan(admin, event, cs);
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

      // A Custom Plan subscription's own lifecycle (renewed, past_due,
      // cancelled) is tracked in custom_plan_purchases, never in
      // `subscriptions`/profiles.tier — those belong to the base Membership
      // subscription only. See syncCustomPlanSubscriptionStatus() for why
      // this never auto-revokes a permission.
      if (sub.metadata?.kind === 'custom_plan') {
        await syncCustomPlanSubscriptionStatus(
          admin,
          sub.id,
          event.type === 'customer.subscription.deleted' ? 'canceled' : normalizeStatus(sub.status)
        );
        return;
      }

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

      if (sub.metadata?.kind === 'custom_plan') {
        await syncCustomPlanSubscriptionStatus(admin, sub.id, normalizeStatus(sub.status));
        return;
      }

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

      if (sub.metadata?.kind === 'custom_plan') {
        await syncCustomPlanSubscriptionStatus(admin, sub.id, normalizeStatus(sub.status));
        return;
      }

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

/**
 * Records a paid Custom Plan purchase and grants EXACTLY the options that
 * were paid for — nothing else.
 *
 * THE ONLY PLACE A CUSTOM PLAN GRANTS ANYTHING. Reaching it requires a
 * signature-verified Stripe event with `payment_status === 'paid'`, same
 * discipline as grantAnalysisAddon() above.
 *
 * PRICE IS RE-VERIFIED HERE, not trusted from metadata: the selected keys are
 * re-run through priceCustomPlan() (the same function the checkout route
 * used to build the session) before anything is recorded, so even a
 * hand-crafted Stripe metadata payload cannot make this function believe a
 * different amount was charged than what the keys actually cost.
 *
 * IDEMPOTENCY IS THE DATABASE'S JOB. `stripe_checkout_session_id` is UNIQUE in
 * `custom_plan_purchases`, so a duplicate delivery loses to a unique
 * violation (23505) rather than granting twice.
 *
 * GRANT, NEVER AUTO-REVOKE. This function only ever sets permission columns
 * to `true`. A cancelled/past_due Custom Plan subscription updates this
 * purchase's own `status` (see syncCustomPlanSubscriptionStatus()) so staff
 * can see it in Admin > Plan Management, but does not flip any permission
 * column back to `false` automatically — mirroring the existing, deliberate
 * rule that COACHING_PERMISSIONS are never auto-revoked by Stripe (see
 * applyEntitlement()'s doc comment). The Standard Options keys purchased here
 * are also never auto-revoked, for the same reason and so that a member who
 * pays for a Standard Option ONLY through a Custom Plan (with no base
 * Membership at all) never has it pulled by an unrelated event; a coach
 * revokes access manually from Admin > Plan Management if a Custom Plan
 * subscription lapses and isn't renewed.
 */
async function grantCustomPlan(
  admin: Admin,
  event: Stripe.Event,
  cs: Stripe.Checkout.Session
): Promise<void> {
  if (cs.payment_status !== 'paid' && cs.payment_status !== 'no_payment_required') {
    console.warn(`[custom-plan] session ${cs.id} is ${cs.payment_status}, not granting`);
    return;
  }

  const profileId = cs.client_reference_id ?? cs.metadata?.profile_id;
  if (!profileId) {
    console.error(`[custom-plan] session ${cs.id} has no profile reference — cannot grant`);
    return;
  }

  let rawStandard: unknown[] = [];
  let rawPersonalized: unknown[] = [];
  try {
    rawStandard = JSON.parse(cs.metadata?.standard_keys ?? '[]');
    rawPersonalized = JSON.parse(cs.metadata?.personalized_keys ?? '[]');
  } catch (err) {
    console.error(`[custom-plan] session ${cs.id} has unparseable option metadata:`, (err as Error).message);
    return;
  }

  // Re-derive the authoritative selection AND price from the same pricing
  // function the checkout route used — never trust the metadata's own
  // amount fields, only the option keys, and only after re-validating them.
  const {
    standardKeys,
    personalizedKeys,
    standardCents,
    personalizedCents,
  } = priceCustomPlan(
    rawStandard.filter((k): k is string => typeof k === 'string'),
    rawPersonalized.filter((k): k is string => typeof k === 'string')
  );

  if (standardKeys.length === 0 && personalizedKeys.length === 0) {
    console.error(`[custom-plan] session ${cs.id} resolved to no valid options — not granting`);
    return;
  }

  const subId = typeof cs.subscription === 'string' ? cs.subscription : cs.subscription?.id;

  const { error } = await admin.from('custom_plan_purchases').insert({
    profile_id: profileId,
    stripe_customer_id: String(cs.customer),
    stripe_checkout_session_id: cs.id,
    stripe_subscription_id: subId ?? null,
    standard_keys: standardKeys,
    personalized_keys: personalizedKeys,
    standard_amount_cents: standardCents,
    personalized_amount_cents: personalizedCents,
    currency: cs.currency ?? 'usd',
    status: 'active',
  });

  if (error) {
    if (error.code === '23505') {
      console.log(`[custom-plan] session ${cs.id} already granted — duplicate ignored`);
      return;
    }
    throw new Error(`could not record custom plan purchase: ${error.message}`);
  }

  // Grant exactly what was purchased. Standard keys ARE MembershipPermission
  // columns already; Personalized keys are resolved through
  // CUSTOM_COACHING_SERVICES to the CoachingPermission column each maps to
  // (several service keys can share one column — that's expected, see the
  // catalog's own doc comment in lib/permissions.ts).
  const grant: Record<string, boolean> = {};
  for (const key of standardKeys) {
    if ((MEMBERSHIP_PERMISSIONS as readonly string[]).includes(key)) grant[key] = true;
  }
  for (const key of personalizedKeys) {
    const svc = CUSTOM_COACHING_SERVICES.find((s) => s.key === key);
    if (svc) grant[svc.relatedPermission] = true;
  }

  if (Object.keys(grant).length > 0) {
    await admin.from('profiles').update(grant).eq('id', profileId);
  }

  await admin.from('audit_log').insert({
    actor_id: null,
    action: 'custom_plan.purchased',
    target_table: 'profiles',
    target_id: profileId,
    meta: {
      standard_keys: standardKeys,
      personalized_keys: personalizedKeys,
      standard_amount_cents: standardCents,
      personalized_amount_cents: personalizedCents,
      stripe_session_id: cs.id,
    },
  });

  console.log(
    `[custom-plan] granted [${[...standardKeys, ...personalizedKeys].join(', ')}] to ${profileId} (session ${cs.id})`
  );
}

/**
 * Mirrors a Custom Plan subscription's Stripe status onto its
 * custom_plan_purchases row(s) for admin visibility — deliberately does NOT
 * touch any permission column. See grantCustomPlan()'s doc comment for why:
 * revoking a coaching-style permission is left to a human, exactly like the
 * pre-existing rule for COACHING_PERMISSIONS in general.
 */
async function syncCustomPlanSubscriptionStatus(
  admin: Admin,
  stripeSubscriptionId: string,
  status: SubscriptionStatus
): Promise<void> {
  await admin
    .from('custom_plan_purchases')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId);
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
 * Every profile_id with an ACTIVE Custom Plan purchase that includes a given
 * Standard Option key, folded into a single lookup set. Used by
 * applyEntitlement() so a base Membership cancellation never revokes a
 * Standard Option the member is still separately paying for through a Custom
 * Plan — see its call site below for the full reasoning.
 */
async function activeCustomPlanStandardKeys(admin: Admin, profileId: string): Promise<Set<string>> {
  const { data } = await admin
    .from('custom_plan_purchases')
    .select('standard_keys')
    .eq('profile_id', profileId)
    .eq('status', 'active');

  const keys = new Set<string>();
  for (const row of data ?? []) {
    for (const k of (row.standard_keys as string[] | null) ?? []) keys.add(k);
  }
  return keys;
}

/**
 * The one place entitlement is granted or revoked.
 * Anything other than trialing/active drops `subscription_active` to false,
 * which the RLS policies read via `auth_has_permission()` — Membership rows
 * become unreadable the moment a payment fails.
 *
 * ALSO the one place the 6 Membership permission columns are written. This
 * covers legacy Standard/Premium subscribers exactly the same as a new $49
 * Membership signup — any tier this function receives is already normalized
 * to 'membership' by tierFromMetadata()/currentTier() below, so a renewal on
 * an old $100 or $149/mo subscription re-grants the full permission set every
 * time, with the old Stripe price itself never touched.
 *
 * Standard Option keys from an ACTIVE Custom Plan purchase (see
 * activeCustomPlanStandardKeys() above) are OR'd on top of the base
 * Membership cascade before writing — additively only, never subtracted —
 * so cancelling/lapsing the base Membership subscription can only ever ADD
 * to what this function would have granted on its own, never take away a
 * Standard Option the member still separately pays for via a Custom Plan.
 *
 * Coaching permissions (video_reviews, weekly_checkins, direct_messaging,
 * one_on_one_coaching, custom_programming) are NEVER touched here — those are
 * admin-managed only, from Admin > Plan Management, and are independent of
 * this Stripe subscription's status. (A Custom Plan purchase CAN grant these
 * — see grantCustomPlan() — but only additively and only from its own
 * dedicated code path, never from this one.)
 */
async function applyEntitlement(
  admin: Admin,
  profileId: string,
  tier: Tier,
  status: SubscriptionStatus
) {
  const active = ACTIVE_SUB_STATUSES.includes(status);
  const normalizedTier: Tier = tier === 'basic' || tier === 'premium' ? 'membership' : tier;

  // `tier` is written unconditionally and `subscription_active` carries the
  // entitlement. On cancellation the tier LABEL is deliberately retained while
  // subscription_active flips false, so /account can still say "Membership —
  // Inactive" and offer a reactivate CTA. Access is unaffected: hasPermission()
  // in lib/session.ts and auth_has_permission() in the RLS policies both
  // require the specific permission column, not just the label.
  //
  // membershipPermissionPatch() is the single shared cascade — the Admin >
  // Users manual activate/deactivate control (app/api/admin/user/route.ts)
  // calls the exact same function so it can never drift from what a real
  // Stripe event does here.
  const permissionUpdate: Record<string, boolean> = {
    ...membershipPermissionPatch(normalizedTier, active),
  };

  const extraStandardKeys = await activeCustomPlanStandardKeys(admin, profileId);
  for (const key of extraStandardKeys) {
    if ((MEMBERSHIP_PERMISSIONS as readonly string[]).includes(key)) permissionUpdate[key] = true;
  }

  await admin
    .from('profiles')
    .update({
      tier: normalizedTier,
      subscription_active: active,
      ...permissionUpdate,
    })
    .eq('id', profileId);

  await admin.from('audit_log').insert({
    actor_id: null,
    action: active ? 'entitlement.granted' : 'entitlement.revoked',
    target_table: 'profiles',
    target_id: profileId,
    meta: { tier: normalizedTier, status },
  });
}
