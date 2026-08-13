-- ============================================================================
-- 0003 — Reconcile tables that exist in BOTH 0001 and 0002
--
-- WHY THIS EXISTS
-- 0002 declares these four tables with `create table if not exists`. Because
-- 0001 already created them (with different columns), Postgres SILENTLY SKIPS
-- the 0002 definition. The result is a database that looks migrated but is
-- missing columns the app writes to:
--
--   subscriptions      → missing setup_fee_paid, setup_fee_amount; wrong enums
--   video_submissions  → missing kind, title, video_path, notes
--   analysis_reviews   → keyed to submission_id, app expects analysis_id
--   leads              → missing name, phone, plan_interest, goals, handled
--
-- Without this migration the Stripe webhook, video review submission, coach
-- review and admin leads page all fail at runtime with "column does not exist".
--
-- STATUS: THIS IS NOW A SAFETY NET, NOT THE PRIMARY FIX.
-- 0002 aborted before it could finish, because its own indexes and policies
-- referenced the reconciled columns. The reconciliation therefore had to move
-- INTO 0002 (see its section "3a"), ahead of the first statement that needs it.
-- Everything below is idempotent and will find nothing left to do on a database
-- migrated with the current 0002. It is kept, unchanged, so that any database
-- already migrated with an older 0002 still converges to the same schema.
--
-- Safe to run more than once.
-- Run AFTER 0001 and 0002.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
alter table subscriptions
  add column if not exists setup_fee_paid   boolean not null default false,
  add column if not exists setup_fee_amount int;

-- tier: membership_tier(free|basic|advanced) -> tier_t(none|basic|premium)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'subscriptions' and column_name = 'tier'
      and udt_name = 'membership_tier'
  ) then
    alter table subscriptions add column tier_tmp tier_t;
    update subscriptions set tier_tmp = case
      when tier::text = 'advanced' then 'premium'::tier_t
      when tier::text = 'basic'    then 'basic'::tier_t
      else 'none'::tier_t
    end;
    alter table subscriptions drop column tier;
    alter table subscriptions rename column tier_tmp to tier;
    alter table subscriptions alter column tier set not null;
  end if;
end $$;

-- status: sub_status -> sub_status_t (adds 'unpaid', drops nothing we use)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'subscriptions' and column_name = 'status'
      and udt_name = 'sub_status'
  ) then
    alter table subscriptions add column status_tmp sub_status_t;
    update subscriptions set status_tmp = case status::text
      when 'trialing'   then 'trialing'::sub_status_t
      when 'active'     then 'active'::sub_status_t
      when 'past_due'   then 'past_due'::sub_status_t
      when 'canceled'   then 'canceled'::sub_status_t
      when 'incomplete' then 'incomplete'::sub_status_t
      else 'incomplete'::sub_status_t
    end;
    alter table subscriptions drop column status;
    alter table subscriptions rename column status_tmp to status;
    alter table subscriptions alter column status set not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. VIDEO SUBMISSIONS
-- ---------------------------------------------------------------------------
alter table video_submissions
  add column if not exists kind       text not null default 'game',
  add column if not exists title      text,
  add column if not exists video_path text,
  add column if not exists notes      text,
  add column if not exists created_at timestamptz not null default now();

-- 0001 made player_id NOT NULL; the app submits without one.
alter table video_submissions alter column player_id drop not null;

-- 0001 made sla_due_at a generated column; the app sets it explicitly.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'video_submissions' and column_name = 'sla_due_at'
      and is_generated = 'ALWAYS'
  ) then
    alter table video_submissions drop column sla_due_at;
    alter table video_submissions add column sla_due_at timestamptz;
  end if;
end $$;

-- carry old notes across, then backfill titles so the list view is not blank
update video_submissions set notes = player_notes
  where notes is null and player_notes is not null;
update video_submissions set title = 'Submission ' || left(id::text, 8)
  where title is null;

-- status: submission_status -> analysis_status_t
--
-- Same view-dependency guard as 0002 section 3a: coach_queue (0001) reads
-- video_submissions.status directly, so it must be dropped before the type
-- swap and recreated after (not left dropped — see below). Kept in step with
-- 0002 so this file stays a true no-op once 0002 has already run the fix.
drop view if exists coach_queue;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'video_submissions' and column_name = 'status'
      and udt_name = 'submission_status'
  ) then
    alter table video_submissions add column status_tmp analysis_status_t;
    update video_submissions set status_tmp = case status::text
      when 'uploading'  then 'uploading'::analysis_status_t
      when 'pending'    then 'queued'::analysis_status_t
      when 'in_review'  then 'in_review'::analysis_status_t
      when 'reviewed'   then 'reviewed'::analysis_status_t
      when 'rejected'   then 'failed'::analysis_status_t
      else 'queued'::analysis_status_t
    end;
    alter table video_submissions drop column status;
    alter table video_submissions rename column status_tmp to status;
    alter table video_submissions alter column status set not null;
    alter table video_submissions alter column status set default 'queued';
  end if;
end $$;

-- Recreate with the remapped literal ('pending' -> 'queued'; see 0002 3a for
-- the full explanation). Unconditional so the view exists on every rerun.
create or replace view coach_queue as
select s.id, s.player_id, p.first_name, p.last_name, p.level,
       s.shot_type, s.submitted_at, s.sla_due_at, s.status,
       (s.sla_due_at < now()) as overdue
from video_submissions s
join players p on p.id = s.player_id
where s.status in ('queued','in_review')
order by s.submitted_at asc;

-- ---------------------------------------------------------------------------
-- 3. ANALYSIS REVIEWS
--    0001 keys these to video_submissions; the app keys them to shot_analyses.
-- ---------------------------------------------------------------------------
alter table analysis_reviews
  add column if not exists analysis_id     uuid references shot_analyses(id) on delete cascade,
  add column if not exists body            text,
  add column if not exists score_overrides jsonb,
  add column if not exists complete        boolean not null default false;

update analysis_reviews set body = summary_md where body is null and summary_md is not null;

-- old rows were 1:1 with a submission; new rows are 1:1 with an analysis
alter table analysis_reviews alter column submission_id drop not null;

create index if not exists analysis_reviews_analysis_idx on analysis_reviews (analysis_id);

-- ---------------------------------------------------------------------------
-- 4. LEADS
-- ---------------------------------------------------------------------------
alter table leads
  add column if not exists name          text,
  add column if not exists phone         text,
  add column if not exists plan_interest text,
  add column if not exists goals         text,
  add column if not exists handled       boolean not null default false;

update leads set name = split_part(email, '@', 1) where name is null;

-- 0001 typed level as play_level; the app posts free text like "16U A".
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'leads' and column_name = 'level' and udt_name = 'play_level'
  ) then
    alter table leads alter column level type text using level::text;
  end if;
end $$;

-- 0001 had unique(email, source); the same family may enquire twice.
alter table leads drop constraint if exists leads_email_source_key;

-- ---------------------------------------------------------------------------
-- 5. RE-ASSERT RLS on the reconciled tables
--    (0002's policies ran, but re-running is harmless and self-documenting.)
-- ---------------------------------------------------------------------------
alter table subscriptions       enable row level security;
alter table video_submissions   enable row level security;
alter table analysis_reviews    enable row level security;
alter table leads               enable row level security;

-- ============================================================================
-- VERIFY — every row should say OK
-- ============================================================================
-- select 'subscriptions.setup_fee_paid' as check,
--        count(*) filter (where column_name = 'setup_fee_paid') > 0 as ok
--   from information_schema.columns where table_name = 'subscriptions'
-- union all select 'video_submissions.title',
--        count(*) filter (where column_name = 'title') > 0
--   from information_schema.columns where table_name = 'video_submissions'
-- union all select 'analysis_reviews.analysis_id',
--        count(*) filter (where column_name = 'analysis_id') > 0
--   from information_schema.columns where table_name = 'analysis_reviews'
-- union all select 'leads.handled',
--        count(*) filter (where column_name = 'handled') > 0
--   from information_schema.columns where table_name = 'leads';
