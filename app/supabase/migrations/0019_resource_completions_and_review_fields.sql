-- ============================================================================
-- 0019 -- TRAINING RESOURCE COMPLETION TRACKING + STRUCTURED REVIEW FIELDS
--
-- Core Coaching Workflow pass.
--
-- Part 1: training_resources has no completion tracking at all today (unlike
-- mindset_lessons -> mindset_progress and workout_sessions ->
-- workout_completions, which already follow this exact shape: one row per
-- (profile_id, content_id), completed_at nullable/settable, RLS is
-- profile_id = auth.uid() to write, auth_is_staff() to read any). This adds
-- the same shape for training_resources, so a member can mark a resource
-- (including a coach-assigned one) complete from /library/[id], and that
-- completion can be derived the same way lib/assignments.ts already derives
-- mindset/workout completion -- no new completion "system", same pattern.
--
-- Part 2: analysis_reviews gets two new nullable text columns so a coach's
-- "strengths" and "areas to improve" are real, distinct, persisted fields
-- instead of being folded into one summary_md blob. Additive -- summary_md
-- is untouched and still the primary written-feedback field.
--
-- The new assignment_content_type enum value ('training_resource') and the
-- assignments check-constraint update that depends on it are deliberately
-- NOT in this migration -- Postgres cannot use a brand-new enum value in the
-- same transaction that added it (used inside a CHECK constraint here), so
-- that follows in migration 0020, applied immediately after this one commits.
-- ============================================================================

-- New enum value only -- NOT used by any constraint/query in this same
-- migration transaction (Postgres forbids using a brand-new enum value
-- before the transaction that added it commits). migration 0020 adds the
-- constraint that references it, and application code only writes it at
-- runtime, in later, separate transactions.
alter type assignment_content_type add value if not exists 'training_resource';

create table if not exists training_resource_completions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  resource_id   uuid not null references training_resources(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (profile_id, resource_id)
);
create index if not exists training_resource_completions_profile_idx
  on training_resource_completions (profile_id);

alter table training_resource_completions enable row level security;

-- Same shape as workout_completions_own / mindset_progress_own: the member
-- reads/writes only their own row (write requires at least 'basic', matching
-- the minimum tier any published training_resources requires), staff read
-- every row for the coach console / assignment completion lookups.
drop policy if exists training_resource_completions_own on training_resource_completions;
create policy training_resource_completions_own on training_resource_completions
  for all using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid() and auth_has_tier('basic'));

comment on table training_resource_completions is
  'Member-marked completion for training_resources, same shape as workout_completions/mindset_progress. Written from /library/[id] "Mark Complete"; read by lib/assignments.ts to derive training_resource assignment completion.';

alter table analysis_reviews
  add column if not exists strengths_md text,
  add column if not exists areas_to_improve_md text;

comment on column analysis_reviews.strengths_md is
  'Coach-entered "whats working" -- distinct from summary_md, added so strengths render as their own section on /reviews/[id] instead of being folded into one blob.';
comment on column analysis_reviews.areas_to_improve_md is
  'Coach-entered "what to fix next" -- distinct from summary_md, same reasoning as strengths_md.';
