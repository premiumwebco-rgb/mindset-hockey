-- ============================================================================
-- 0004 — AI SHOT ANALYSIS
--
-- Two jobs:
--
--   1. OPEN AI SHOT ANALYSIS TO BOTH TIERS.
--      0002 gated shot_analyses and the storage buckets on
--      auth_has_tier('premium'). AI Shot Analysis is now included with the
--      Standard plan too, so every one of those policies moves to
--      auth_has_tier('basic') — which the function reads as "basic OR premium,
--      with an active subscription". A cancelled member still loses access.
--
--   2. STORE THE ACTUAL VIDEO.
--      The previous implementation only ever sent extracted frames to the model
--      and wrote a bare filename into video_path. The source clip was never
--      persisted, so nothing could be replayed, re-analysed or shown to a coach.
--      This migration adds the columns that make a real stored object
--      addressable, plus per-category results and cost/telemetry fields.
--
-- Idempotent. Run AFTER 0001, 0002 and 0003.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. COLUMNS
-- ---------------------------------------------------------------------------
alter table shot_analyses
  -- Storage: bucket + object path, so a signed URL can be minted on demand.
  -- video_path alone was ambiguous once more than one bucket existed.
  add column if not exists video_bucket     text not null default 'member-videos',
  add column if not exists video_original_name text,

  -- Per-category results in the shape lib/ai/rubric.ts defines. `scores` from
  -- 0002 held the old 10-point coach rubric; this is the AI rubric and is kept
  -- separate so the two can evolve independently.
  add column if not exists category_scores  jsonb,
  add column if not exists improvement_areas text[],
  add column if not exists graded_count     int,

  -- Telemetry, for cost control and debugging.
  add column if not exists processing_ms    int,
  add column if not exists frame_count      int,
  add column if not exists requested_review boolean not null default false,
  add column if not exists reviewed_by      uuid references profiles(id) on delete set null;

-- overall_score must be nullable: "nothing was gradeable" is a valid outcome
-- and must never be coerced to 0, which would read as a real (terrible) score.
alter table shot_analyses alter column overall_score drop not null;

-- video_path was `not null` but the upload now happens before the row is
-- finalised, so an analysis legitimately exists briefly without one.
alter table shot_analyses alter column video_path drop not null;

comment on column shot_analyses.category_scores is
  'CategoryScore[] from lib/ai/rubric.ts. score is null where the footage could not support a judgement — never a guess.';
comment on column shot_analyses.confidence is
  'Overall model confidence 0-1, capped at the share of the rubric actually gradeable.';

-- ---------------------------------------------------------------------------
-- 2. USAGE LEDGER  (rate limiting / cost control)
--
-- Every model call costs money. 0002 had no limiting at all. Counting rows in
-- shot_analyses would undercount deleted ones, so usage is recorded separately
-- and is never deleted by the member.
-- ---------------------------------------------------------------------------
create table if not exists ai_usage (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  analysis_id uuid references shot_analyses(id) on delete set null,
  model       text,
  frame_count int,
  succeeded   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_profile_idx on ai_usage (profile_id, created_at desc);

alter table ai_usage enable row level security;

-- Members may read their own usage (so the UI can show "3 of 5 today left").
-- Nobody but the service role may write it — otherwise a member could clear
-- their own quota.
drop policy if exists ai_usage_own_read on ai_usage;
create policy ai_usage_own_read on ai_usage
  for select using (profile_id = auth.uid() or auth_is_staff());

-- ---------------------------------------------------------------------------
-- 3. RLS — shot_analyses moves from premium to basic
-- ---------------------------------------------------------------------------
drop policy if exists analyses_own_read on shot_analyses;
create policy analyses_own_read on shot_analyses
  for select using (
    (profile_id = auth.uid() and auth_has_tier('basic')) or auth_is_staff()
  );

drop policy if exists analyses_own_insert on shot_analyses;
create policy analyses_own_insert on shot_analyses
  for insert with check (profile_id = auth.uid() and auth_has_tier('basic'));

drop policy if exists analyses_own_update on shot_analyses;
create policy analyses_own_update on shot_analyses
  for update using (profile_id = auth.uid() and auth_has_tier('basic'))
  with check (profile_id = auth.uid() and auth_has_tier('basic'));

-- Delete deliberately does NOT require an active tier: a lapsed member must
-- still be able to remove their own footage. Privacy beats entitlement.
drop policy if exists analyses_own_delete on shot_analyses;
create policy analyses_own_delete on shot_analyses
  for delete using (profile_id = auth.uid() or auth_is_admin());

drop policy if exists analyses_staff_all on shot_analyses;
create policy analyses_staff_all on shot_analyses
  for all using (auth_is_staff()) with check (auth_is_staff());

-- Coach commentary on an AI analysis — the human-review fallback path.
drop policy if exists analysis_reviews_read on analysis_reviews;
create policy analysis_reviews_read on analysis_reviews
  for select using (
    auth_is_staff() or exists (
      select 1 from shot_analyses a
      where a.id = analysis_id and a.profile_id = auth.uid() and auth_has_tier('basic')
    )
  );

drop policy if exists analysis_reviews_staff_write on analysis_reviews;
create policy analysis_reviews_staff_write on analysis_reviews
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---------------------------------------------------------------------------
-- 4. STORAGE — same tier move
--
-- Objects live at  <user-uuid>/<analysis-id>/<file>  so the owner is the first
-- path segment. This is what stops member A reading member B's video even with
-- a valid session and a guessed path.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('member-videos', 'member-videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('analysis-frames', 'analysis-frames', false)
on conflict (id) do nothing;

-- Both buckets stay private. Playback happens through short-lived signed URLs
-- minted server-side, never by making the bucket public.
update storage.buckets set public = false
  where id in ('member-videos', 'analysis-frames');

drop policy if exists member_videos_own_read on storage.objects;
create policy member_videos_own_read on storage.objects
  for select using (
    bucket_id in ('member-videos','analysis-frames')
    and ((storage.foldername(name))[1] = auth.uid()::text or auth_is_staff())
  );

drop policy if exists member_videos_own_write on storage.objects;
create policy member_videos_own_write on storage.objects
  for insert with check (
    bucket_id in ('member-videos','analysis-frames')
    and (storage.foldername(name))[1] = auth.uid()::text
    and auth_has_tier('basic')
  );

drop policy if exists member_videos_own_update on storage.objects;
create policy member_videos_own_update on storage.objects
  for update using (
    bucket_id in ('member-videos','analysis-frames')
    and (storage.foldername(name))[1] = auth.uid()::text
    and auth_has_tier('basic')
  );

drop policy if exists member_videos_own_delete on storage.objects;
create policy member_videos_own_delete on storage.objects
  for delete using (
    bucket_id in ('member-videos','analysis-frames')
    and ((storage.foldername(name))[1] = auth.uid()::text or auth_is_admin())
  );

-- ---------------------------------------------------------------------------
-- 5. VERIFICATION
--
-- Run this after applying. Every row should read tier_required = 'basic'.
-- If any still say premium, this migration did not apply cleanly.
--
--   select policyname,
--          case when qual::text like '%premium%'
--                 or with_check::text like '%premium%'
--               then 'premium' else 'basic' end as tier_required
--   from pg_policies
--   where tablename = 'shot_analyses';
--
-- And confirm both buckets are private:
--
--   select id, public from storage.buckets
--   where id in ('member-videos','analysis-frames');
--   -- expect public = false for both
-- ---------------------------------------------------------------------------
