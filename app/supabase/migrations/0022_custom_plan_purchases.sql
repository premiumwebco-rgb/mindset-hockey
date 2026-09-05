-- ============================================================================
-- 0022 -- CUSTOM PLAN PURCHASES (paid Custom Plan checkout)
--
-- Records exactly what a member bought through the priced Custom Plan
-- builder (/coaching/request) and paid for via Stripe Checkout: the selected
-- Standard Option keys (MEMBERSHIP_PERMISSIONS) and Personalized Option keys
-- (CUSTOM_COACHING_SERVICES), the price actually charged for each group, and
-- which Stripe subscription is billing it. One row per successful checkout;
-- created ONLY by the Stripe webhook (service role) after payment is
-- confirmed -- see grantCustomPlan() in app/api/stripe/webhook/route.ts.
-- Never written by the session client -- there is deliberately no
-- insert/update policy for `authenticated`, only a read policy below.
--
-- This is additive only: nothing existing (custom_plan_requests, the
-- Membership `subscriptions` table, profiles' permission columns) is
-- altered by this migration.
-- ============================================================================

create table if not exists custom_plan_purchases (
  id                          uuid primary key default gen_random_uuid(),
  profile_id                  uuid not null references profiles(id) on delete cascade,
  stripe_customer_id          text not null,
  stripe_checkout_session_id  text not null unique,
  stripe_subscription_id      text unique,
  standard_keys               text[] not null default '{}',
  personalized_keys           text[] not null default '{}',
  standard_amount_cents       integer not null default 0,
  personalized_amount_cents   integer not null default 0,
  currency                    text not null default 'usd',
  status                      text not null default 'active'
    check (status in ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists custom_plan_purchases_profile_idx
  on custom_plan_purchases (profile_id);

alter table custom_plan_purchases enable row level security;

-- Member reads their own purchases; staff/admin read every row for Admin >
-- Plan Management. No insert/update/delete policy for `authenticated` --
-- only the webhook's service-role (admin) client, which bypasses RLS,
-- ever writes this table.
drop policy if exists custom_plan_purchases_read on custom_plan_purchases;
create policy custom_plan_purchases_read on custom_plan_purchases
  for select
  using (profile_id = auth.uid() or auth_is_staff());

comment on table custom_plan_purchases is
  'Itemized record of a paid Custom Plan purchase (Standard + Personalized option keys and the price charged for each), created by the Stripe webhook after payment is confirmed. Drives which permission columns grantCustomPlan() turns on; status is mirrored from the underlying Stripe subscription for admin visibility but is never used to auto-revoke a permission -- see the doc comments on grantCustomPlan()/syncCustomPlanSubscriptionStatus() in app/api/stripe/webhook/route.ts.';
