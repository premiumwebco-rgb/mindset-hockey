-- ============================================================================
-- 0015 — MINDSET TRAINING LIBRARY: VIDEO/THUMBNAIL FIELDS
--
-- AUDIT FINDING
-- mindset_lessons (0002) already exists and already has: slug, title,
-- required_tier, is_published, sort_order — exactly the admin-management
-- fields Part 6 asks for. What it does NOT have is a video-lesson shape: it
-- was built as a text/markdown curriculum (body_md, exercise_md,
-- reflection_prompts), with no thumbnail, video URL or duration. Rather than
-- create a second, duplicate "mindset content" table, this migration adds
-- the missing columns to the existing one. Nothing already reading this
-- table (getMindsetLessons in lib/data.ts, the dashboard/mindset pages)
-- selects columns by `select *`, so adding nullable columns changes no
-- existing behavior.
--
-- `topic` (existing, free-text: confidence | toughness | accountability | …)
-- is left untouched — it is already used by existing rows and existing UI
-- copy. `category` below is a NEW, separate column for Part 6's specific
-- 8-value taxonomy (Confidence, Visualization, Resilience, Leadership,
-- Focus, Pressure Performance, Goal Setting, Mental Recovery), so the new
-- admin screen has an exact, constrained set to choose from without
-- reinterpreting or breaking whatever `topic` already means on existing rows.
--
-- Additive only. No existing column, constraint, policy or row is changed.
-- ============================================================================

alter table mindset_lessons
  add column if not exists category      text,
  add column if not exists thumbnail_path text,
  add column if not exists video_url      text,
  add column if not exists duration_sec   int;

-- Constrained to the 8 categories the admin screen offers — NULL (an
-- existing or not-yet-categorized row) is explicitly allowed, so this adds
-- zero backfill obligation.
alter table mindset_lessons
  drop constraint if exists mindset_lessons_category_check;
alter table mindset_lessons
  add constraint mindset_lessons_category_check check (
    category is null or category in (
      'confidence', 'visualization', 'resilience', 'leadership',
      'focus', 'pressure_performance', 'goal_setting', 'mental_recovery'
    )
  );

alter table mindset_lessons
  drop constraint if exists mindset_lessons_duration_check;
alter table mindset_lessons
  add constraint mindset_lessons_duration_check check (duration_sec is null or duration_sec >= 0);

comment on column mindset_lessons.category is
  'Part 6 mindset-video taxonomy (confidence/visualization/resilience/leadership/focus/pressure_performance/goal_setting/mental_recovery). Separate from the existing free-text `topic` column used by earlier text-lesson rows.';
comment on column mindset_lessons.thumbnail_path is
  'Storage path in the existing private training-resources bucket (0008) — reuses that bucket''s staff-write/member-read policies rather than creating a new bucket. Never a public URL; served via signed URL like every other training asset.';
comment on column mindset_lessons.video_url is
  'External or hosted video URL for the lesson (e.g. a signed/streamable link). Plain text field per the Part 6 spec — no new video-hosting infrastructure introduced.';
comment on column mindset_lessons.duration_sec is
  'Cosmetic run-time display only, same convention as training_resources.duration_sec (0010) — not an enforcement boundary.';

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type from information_schema.columns
--    where table_name = 'mindset_lessons'
--    order by ordinal_position;
--
--   -- existing rows unaffected (must equal the pre-migration count):
--   select count(*) from mindset_lessons;
-- ============================================================================
