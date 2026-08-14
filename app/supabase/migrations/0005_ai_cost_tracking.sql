-- ============================================================================
-- 0005 — AI PROVIDER COST TRACKING
--
-- WHY THIS EXISTS
-- `ai_usage` recorded that an analysis happened, but not what it cost. Without
-- token counts there is no way to answer "am I near my monthly Anthropic
-- budget?", which is the question that actually matters for spend control.
--
-- TWO SEPARATE SYSTEMS, DELIBERATELY
--   Customer entitlement : 1 analysis = 1 entitlement (Standard 7/wk, Premium
--                          14/wk). Counted as ROWS in this table.
--   Platform cost        : provider tokens -> estimated USD. Counted in the
--                          COLUMNS added below.
-- One row can carry two provider calls (an automatic format-repair retry) and
-- still costs the customer exactly one entitlement, while correctly reporting
-- the tokens both calls consumed.
--
-- NOTHING IS FABRICATED
-- Token counts come from the provider response. `estimated_cost_usd` is only
-- populated when the operator has supplied rates (AI_COST_PER_MTOK_INPUT /
-- _OUTPUT); otherwise it stays NULL, which means "not known" rather than "$0".
--
-- NO NEW ENFORCEMENT
-- These columns are observability only. Nothing in the application blocks an
-- analysis based on them. The emergency control remains the operator-flipped
-- AI_ENABLED kill switch.
--
-- Idempotent. Adds columns only — no table, RLS policy, index or existing
-- column is altered. The existing ai_usage RLS still applies unchanged:
-- members may SELECT their own rows and there is no INSERT/UPDATE/DELETE
-- policy, so only the service-role client can write cost data.
-- ============================================================================

alter table ai_usage
  -- Which provider actually served the call ('anthropic' | 'openai').
  add column if not exists provider text,

  -- Provider-reported token counts. NULL means the provider did not report
  -- them, never zero.
  add column if not exists input_tokens  int,
  add column if not exists output_tokens int,

  -- Estimated USD for this row, from operator-supplied rates. NULL when no
  -- rate is configured. numeric(12,6) keeps sub-cent precision without float
  -- rounding error.
  add column if not exists estimated_cost_usd numeric(12,6),

  -- How many provider calls this single entitlement consumed: 1 normally, 2
  -- when an automatic format-repair retry was needed.
  add column if not exists provider_attempts int not null default 1,

  -- Per-attempt breakdown: [{provider, model, inputTokens, outputTokens, kind}]
  -- where kind is 'primary' or 'repair'. Kept as jsonb so the shape can evolve
  -- without another migration.
  add column if not exists attempt_breakdown jsonb;

comment on column ai_usage.estimated_cost_usd is
  'Estimated USD from operator-supplied token rates. NULL means no rate configured — not zero cost.';
comment on column ai_usage.provider_attempts is
  'Provider calls consumed by this ONE customer entitlement. 2 when an automatic repair retry ran.';

-- Supports "what have I spent this month?" without scanning the whole table.
create index if not exists ai_usage_cost_idx on ai_usage (created_at desc)
  where estimated_cost_usd is not null;

-- ============================================================================
-- OPERATOR QUERIES — monthly Anthropic spend
-- ============================================================================
-- Spend so far this calendar month (matches how the provider bills):
--
--   select
--     count(*)                                as analyses,
--     sum(provider_attempts)                  as provider_calls,
--     sum(input_tokens)                       as input_tokens,
--     sum(output_tokens)                      as output_tokens,
--     round(sum(estimated_cost_usd), 2)       as estimated_usd
--   from ai_usage
--   where created_at >= date_trunc('month', now());
--
-- If estimated_usd is NULL, no rates are configured — set
-- AI_COST_PER_MTOK_INPUT and AI_COST_PER_MTOK_OUTPUT from your provider's
-- pricing page. Token totals are accurate either way.
--
-- Heaviest members this month:
--
--   select profile_id, count(*) as analyses,
--          round(sum(estimated_cost_usd), 2) as usd
--   from ai_usage
--   where created_at >= date_trunc('month', now())
--   group by profile_id order by usd desc nulls last limit 20;
-- ============================================================================
