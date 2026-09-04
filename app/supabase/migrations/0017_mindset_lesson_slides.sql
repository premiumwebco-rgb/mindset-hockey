-- ============================================================================
-- 0017 — MINDSET TRAINING LIBRARY: SLIDE-BASED LESSON CONTENT
--
-- mindset_lessons (0002) already has body_md/exercise_md/reflection_prompts
-- (a single-scroll text lesson shape) and, since 0015, category/thumbnail_path/
-- video_url/duration_sec (a video-lesson shape). Neither shape models a
-- structured, multi-slide educational lesson (what it is / why it matters in
-- hockey / what it looks like / common mistakes / technique / drill /
-- takeaway) without either overloading body_md with ad-hoc markdown headers
-- (fragile to parse, easy to render inconsistently) or standing up a second
-- "mindset content" table (which the existing architecture explicitly asks
-- us not to do).
--
-- This adds ONE additive, nullable column — `slides` — holding that
-- structured content as jsonb. A row with slides = null renders exactly as it
-- does today (nothing reads this column yet outside the new lesson-viewer
-- page and admin list, so no existing behavior changes). A row with slides
-- populated gets the full slideshow lesson experience.
--
-- Shape (validated by the check constraint below):
--   [{ "kind": "what|why|look|mistakes|technique|drill|takeaway",
--      "heading": "...", "body": "..." }, ...]
-- ============================================================================

alter table mindset_lessons
  add column if not exists slides jsonb;

-- Postgres check constraints can't contain subqueries, so this validates only
-- the top-level shape (a JSON array); per-slide field shape is validated in
-- application code (the admin API route) before it's ever written.
alter table mindset_lessons
  drop constraint if exists mindset_lessons_slides_check;
alter table mindset_lessons
  add constraint mindset_lessons_slides_check check (
    slides is null or jsonb_typeof(slides) = 'array'
  );

comment on column mindset_lessons.slides is
  'Structured multi-slide lesson content: jsonb array of {kind, heading, body}. Null for legacy text lessons (body_md/exercise_md) and for video-only stub lessons — both keep working unchanged. Populated for the "skill guide" flagship lesson in each category.';

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type from information_schema.columns
--    where table_name = 'mindset_lessons' order by ordinal_position;
--   select count(*) from mindset_lessons; -- unaffected by this migration
-- ============================================================================
