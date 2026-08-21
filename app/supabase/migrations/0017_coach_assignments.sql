-- ============================================================================
-- 0017 — Coach Assignment System (Phase A / MVP)
--
-- One new table: assignments. A coach or admin points an existing piece of
-- content at a specific player — or, for video_review / ai_shot_analysis,
-- simply assigns the activity itself, since there is no single content row
-- to point at — with an optional due date and note.
--
-- Deliberately NOT included in this migration (later phases, per the
-- approved architecture design):
--   - training_resource / nutrition content types (no completion source
--     exists for either yet)
--   - goals / weekly-plan tables
--   - assignment history, audit-log, or template tables
--   - a coach-to-player roster table (every coach already sees every player,
--     matching the existing video_submissions / shot_analyses staff policies)
--
-- Completion is intentionally NEVER written here for any of the four Phase A
-- content types — it is derived at read time from mindset_progress,
-- workout_completions, video_submissions.status, and shot_analyses.status
-- respectively (see lib/assignments.ts). The completed_at column below is
-- part of the minimum schema for a future content type with no completion
-- source of its own; Phase A application code never writes to it.
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'assignment_content_type') then
    create type assignment_content_type as enum
      ('mindset_lesson', 'workout_session', 'video_review', 'ai_shot_analysis');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type assignment_status as enum ('active', 'dismissed');
  end if;
end $$;

create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  assigned_by  uuid not null references profiles(id) on delete cascade,
  content_type assignment_content_type not null,
  content_id   uuid,
  due_at       timestamptz,
  note         text,
  status       assignment_status not null default 'active',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint assignments_content_id_shape check (
    (content_type in ('mindset_lesson', 'workout_session') and content_id is not null)
    or (content_type in ('video_review', 'ai_shot_analysis') and content_id is null)
  )
);

-- The player's own "active assignments" read (/development) and the coach's
-- "assignments I made" list (/coach/assign) are the only two query shapes
-- this table serves — one index per shape.
create index if not exists assignments_profile_status_idx on assignments (profile_id, status);
create index if not exists assignments_assigned_by_idx on assignments (assigned_by, created_at desc);

alter table assignments enable row level security;

-- Read: a player sees only their own rows; staff (coach/admin) see every
-- row — the same shape as vsub_staff_all / analyses_staff_all already in
-- use for video_submissions and shot_analyses. auth_is_staff() already
-- exists (migration 0002) — no new helper function.
drop policy if exists assignments_own_read on assignments;
create policy assignments_own_read on assignments
  for select using (profile_id = auth.uid() or auth_is_staff());

-- Write: only staff create or update assignments. A player has no insert,
-- update, or delete path at all — not even to their own row — so RLS, not
-- hidden UI, is what stops a player from marking their own assignment
-- complete, changing a due date, or dismissing it.
drop policy if exists assignments_staff_insert on assignments;
create policy assignments_staff_insert on assignments
  for insert with check (auth_is_staff());

drop policy if exists assignments_staff_update on assignments;
create policy assignments_staff_update on assignments
  for update using (auth_is_staff()) with check (auth_is_staff());

-- No delete policy for anyone. "Dismiss" is a status update (status ->
-- 'dismissed'), never a row deletion — so there is always a record of what
-- was assigned, even after a coach dismisses it.
