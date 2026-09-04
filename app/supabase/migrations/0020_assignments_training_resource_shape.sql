-- ============================================================================
-- 0020 -- allow training_resource assignments (content_id required)
--
-- Must run AFTER 0019 commits (that migration added the 'training_resource'
-- enum value; this one is the first to actually use it, which Postgres does
-- not allow within the same transaction that added the value).
--
-- A coach assigning training_resources during video review (lib/video-
-- review-rubric.ts) creates one `assignments` row per assigned resource, so
-- the assignment surfaces on /development the same way mindset_lesson /
-- workout_session assignments already do. training_resource always has a
-- specific content_id (the resource itself), same shape as mindset_lesson /
-- workout_session -- never null like video_review / ai_shot_analysis.
-- ============================================================================

alter table assignments drop constraint if exists assignments_content_id_shape;
alter table assignments add constraint assignments_content_id_shape check (
  (content_type in ('mindset_lesson', 'workout_session', 'training_resource') and content_id is not null)
  or (content_type in ('video_review', 'ai_shot_analysis') and content_id is null)
);
