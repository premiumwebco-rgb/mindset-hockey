-- ============================================================================
-- 0018 — CONSOLIDATE is_staff() ONTO auth_is_staff(), RETARGET
--         review_prescriptions TO training_resources
--
-- Production Cleanup, priority 5 (security) + priority 2 (content
-- consolidation). NOT auto-applied — reviewed and applied manually.
--
-- Part 1: is_staff() (migration 0001) and auth_is_staff() (migration 0002)
-- are confirmed functionally identical:
--   is_staff()      = exists(select 1 from profiles where id = auth.uid()
--                             and role in ('coach','admin'))
--   auth_is_staff() = coalesce((select role in ('admin','coach') from
--                             profiles where id = auth.uid()), false)
-- Several 0001 policies still reference the bare is_staff(). Some were
-- already functionally superseded by same-table, differently-named 0002
-- policies (both sets stayed live side by side because "drop policy if
-- exists <old-name>" only drops a policy by that exact name — Postgres RLS
-- OR's every matching policy together, so this was redundant, not a hole).
-- Those are dropped outright here. The remainder (players, review_scores,
-- review_annotations, review_prescriptions) have no superseding policy and
-- are recreated in place on auth_is_staff() instead of dropped.
--
-- IMPORTANT CORRECTION caught while writing this migration: 0001's
-- "read own reviews" on analysis_reviews let a member read their own
-- submission_id-keyed, published review. 0002 then added an analysis_id
-- column (for a shot_analyses-based review that was never built) and its
-- same-named `analysis_reviews_read` policy (last redefined in migration
-- 0004) checks ONLY shot_analyses.analysis_id — it dropped the
-- submission_id-based own-read clause entirely. That was harmless while
-- analysis_reviews had zero real rows, but lib/video-review-rubric.ts
-- (added this phase) is the first real writer, keyed by submission_id — so
-- "read own reviews" is NOT redundant, it is the only thing that would let
-- a member ever see their own structured video review. This migration
-- restores that clause by recreating `analysis_reviews_read` (the live,
-- currently-active policy name) with both clauses, then drops the
-- now-genuinely-redundant "read own reviews" and "staff write reviews".
--
-- Part 2: review_prescriptions.drill_id referenced the legacy `drills`
-- table, which is dead (lib/demo-data.ts fixtures only, zero real rows,
-- never populated by any admin tool). Retargeted to training_resources —
-- the platform's one real content catalogue — before this table is ever
-- written to (lib/video-review-rubric.ts, added this phase, is the first
-- real writer). Safe: review_prescriptions has zero real rows today.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Part 1a — drop policies made redundant by an existing, equivalent,
-- differently-named policy on the same table (auth_is_staff()-based).
-- ---------------------------------------------------------------------------
drop policy if exists "read own profile" on profiles;               -- superseded by profiles_self_read / profiles_admin_all
drop policy if exists "own submissions" on video_submissions;       -- superseded by vsub_own_read
drop policy if exists "create own submissions" on video_submissions; -- superseded by vsub_own_insert
drop policy if exists "staff update submissions" on video_submissions; -- superseded by vsub_staff_all
drop policy if exists "staff write reviews" on analysis_reviews;    -- superseded by analysis_reviews_staff_write
drop policy if exists "staff read leads" on leads;                  -- superseded by leads_staff_read

-- "read own reviews"' submission_id-based own-read clause is folded into
-- analysis_reviews_read (recreated below) rather than simply dropped; see
-- the correction note above.
drop policy if exists "read own reviews" on analysis_reviews;
drop policy if exists analysis_reviews_read on analysis_reviews;
create policy analysis_reviews_read on analysis_reviews
  for select using (
    auth_is_staff()
    or exists (
      select 1 from shot_analyses a
      where a.id = analysis_id and a.profile_id = auth.uid() and auth_has_tier('basic')
    )
    or exists (
      select 1 from video_submissions s
      where s.id = submission_id and s.profile_id = auth.uid() and analysis_reviews.published_at is not null
    )
  );

-- ---------------------------------------------------------------------------
-- Part 1b — recreate the remaining is_staff()-only policies on
-- auth_is_staff(). No functional change (confirmed identical semantics
-- above); this only removes the last references to is_staff() so it can be
-- dropped.
-- ---------------------------------------------------------------------------
drop policy if exists "own players" on players;
create policy "own players" on players for all
  using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "staff write scores" on review_scores;
create policy "staff write scores" on review_scores for all
  using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists "staff write annotations" on review_annotations;
create policy "staff write annotations" on review_annotations for all
  using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists "staff write prescriptions" on review_prescriptions;
create policy "staff write prescriptions" on review_prescriptions for all
  using (auth_is_staff()) with check (auth_is_staff());

-- ---------------------------------------------------------------------------
-- Part 1c — is_staff() now has zero references anywhere in the schema. Drop
-- it; auth_is_staff() is the single remaining staff-check helper.
-- ---------------------------------------------------------------------------
drop function if exists is_staff();

-- ---------------------------------------------------------------------------
-- Part 2 — retarget review_prescriptions from the legacy drills table to
-- training_resources.
-- ---------------------------------------------------------------------------
alter table review_prescriptions drop constraint if exists review_prescriptions_drill_id_fkey;
alter table review_prescriptions rename column drill_id to resource_id;
alter table review_prescriptions
  add constraint review_prescriptions_resource_id_fkey
  foreign key (resource_id) references training_resources(id) on delete cascade;

comment on column review_prescriptions.resource_id is
  'References training_resources(id) — retargeted in migration 0018 from the legacy, always-empty drills table. Populated by lib/video-review-rubric.ts.';

-- ============================================================================
-- VERIFY
-- ============================================================================
--   -- no remaining references to is_staff anywhere in the schema:
--   select proname from pg_proc where proname = 'is_staff';        -- expect 0 rows
--
--   -- review_prescriptions now points at training_resources:
--   select conname, confrelid::regclass
--   from pg_constraint
--   where conrelid = 'review_prescriptions'::regclass and contype = 'f';
-- ============================================================================
