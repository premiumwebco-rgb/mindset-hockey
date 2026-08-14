-- ============================================================================
-- 0006 — PAID ADD-ON AI SHOT ANALYSES  ($0.50 each)
--
-- TWO BALANCES, ONE RESERVATION PATH
--   INCLUDED   weekly, tier-based, resets every 7 days (AI_ANALYSIS_LIMITS).
--              Counted as rows in `ai_usage` inside the current window.
--   PURCHASED  one-time $0.50 buys, PERSISTENT — never reset, never expire.
--              Granted only by a verified Stripe webhook.
--
-- Included is always consumed first. Only when the weekly allowance is spent
-- does a reservation draw from the purchased balance.
--
-- WHY A LEDGER AND NOT A COUNTER
-- `analysis_credits` already exists from 0001, but it is a single mutable
-- counter with monthly-reset semantics and no link to a payment. Reusing it
-- would reintroduce the calendar-month behaviour this product explicitly does
-- not want, and would make a double-grant invisible. It is left untouched.
--
-- Instead: an APPEND-ONLY purchase ledger. Every row is one paid purchase tied
-- to the Stripe objects that created it. Remaining balance is derived:
--
--     purchased_remaining =
--         sum(analysis_purchases.quantity)
--       - count(ai_usage where entitlement_source = 'purchased')
--
-- Nothing is decremented, so a bug can never silently destroy paid credit, and
-- the full payment history stays auditable.
--
-- IDEMPOTENCY IS ENFORCED BY THE DATABASE, NOT BY APPLICATION LOGIC
-- `stripe_event_id` and `stripe_session_id` are both UNIQUE. A replayed webhook
-- loses to a unique-violation instead of granting a second analysis. That
-- guarantee survives concurrent deliveries, which an if-not-exists check in
-- application code would not.
--
-- Additive only. No existing table, column, policy or index is altered.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PURCHASE LEDGER  (append-only)
-- ---------------------------------------------------------------------------
create table if not exists analysis_purchases (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references profiles(id) on delete cascade,

  -- Stripe provenance. Both unique: the same payment can never be banked twice.
  stripe_event_id    text unique,
  stripe_session_id  text unique,
  stripe_payment_intent_id text,

  -- What was actually bought. Written from the SERVER's product definition
  -- after verifying the Stripe price — never from client input.
  quantity           int not null default 1 check (quantity > 0),
  amount_cents       int not null check (amount_cents >= 0),
  currency           text not null default 'usd',

  created_at         timestamptz not null default now()
);

create index if not exists analysis_purchases_profile_idx
  on analysis_purchases (profile_id, created_at desc);

comment on table analysis_purchases is
  'Append-only ledger of paid AI Shot Analysis add-ons. Never updated or deleted; remaining balance is derived against ai_usage.entitlement_source.';

-- ---------------------------------------------------------------------------
-- 2. WHICH BALANCE DID AN ANALYSIS DRAW FROM?
-- ---------------------------------------------------------------------------
alter table ai_usage
  -- 'included' (weekly allowance) or 'purchased' (paid add-on).
  -- Existing rows default to 'included', which is correct: every analysis
  -- before this migration came from a weekly allowance.
  add column if not exists entitlement_source text not null default 'included';

-- Makes the purchased-consumption count a cheap index scan.
create index if not exists ai_usage_purchased_idx
  on ai_usage (profile_id)
  where entitlement_source = 'purchased';

comment on column ai_usage.entitlement_source is
  'Which balance this analysis consumed: included (weekly) or purchased (paid add-on). Set server-side at reservation time.';

-- ---------------------------------------------------------------------------
-- 3. RLS — read your own, write nothing
-- ---------------------------------------------------------------------------
alter table analysis_purchases enable row level security;

-- Members may SEE what they bought, so the UI can show a balance.
drop policy if exists analysis_purchases_own_read on analysis_purchases;
create policy analysis_purchases_own_read on analysis_purchases
  for select using (profile_id = auth.uid() or auth_is_staff());

-- DELIBERATELY NO INSERT / UPDATE / DELETE POLICY.
--
-- With RLS enabled and no write policy, every write from an anon or
-- authenticated client is denied by default. Only the service-role client —
-- used exclusively by the Stripe webhook after signature verification — can
-- create a purchase. A member cannot mint themselves free analyses, cannot
-- edit a quantity, and cannot delete a consumed record. This mirrors how
-- `ai_usage` is already protected.

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select
--     (select coalesce(sum(quantity), 0) from analysis_purchases
--       where profile_id = '<uuid>')                          as purchased_total,
--     (select count(*) from ai_usage
--       where profile_id = '<uuid>'
--         and entitlement_source = 'purchased')               as purchased_used;
--   -- remaining = purchased_total - purchased_used
-- ============================================================================
