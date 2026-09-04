-- ============================================================================
-- 0018 — MINDSET SKILL GUIDES: EXTERNAL (YOUTUBE) VIDEO SUPPORT
--
-- mindset_lessons.video_url (0015) already exists, but it holds a STORAGE
-- PATH into the private training-resources bucket for an admin-uploaded
-- file — getMindsetLessonForViewing() always runs it through
-- supabase.storage.createSignedUrl(). An external creator's YouTube video
-- has no storage object to sign, so reusing video_url unlabeled would make
-- every read ambiguous between "sign this path" and "this is already a
-- playable URL."
--
-- Rather than a second video table/column set, this adds the smallest
-- discriminator: `video_type` says which kind video_url currently holds.
-- Existing rows (all admin-uploaded) are backfilled to 'upload' below, so
-- every current reader of video_url keeps working unchanged — only a row
-- explicitly marked 'youtube' skips the signing step.
--
-- video_title / video_source / video_note are additive display fields for
-- the external-video case (the video's real title, the creator/channel name,
-- and a short editorial note on why it's relevant to this specific lesson) —
-- all admin-editable later the same way every other mindset_lessons column
-- already is, no new CMS.
-- ============================================================================

alter table mindset_lessons
  add column if not exists video_type   text,
  add column if not exists video_title  text,
  add column if not exists video_source text,
  add column if not exists video_note   text;

alter table mindset_lessons
  drop constraint if exists mindset_lessons_video_type_check;
alter table mindset_lessons
  add constraint mindset_lessons_video_type_check check (
    video_type is null or video_type in ('upload', 'youtube')
  );

-- Backfill: every row that already has a video_url today got there through
-- the existing admin upload flow (api/admin/mindset/video), so it is an
-- 'upload' storage path, not a URL — never touches rows added going forward
-- with an explicit type.
update mindset_lessons
  set video_type = 'upload'
  where video_url is not null and video_type is null;

comment on column mindset_lessons.video_type is
  'Which kind of value video_url holds: ''upload'' = a training-resources storage path (signed via Supabase Storage, the original 0015 behavior), ''youtube'' = a playable youtube.com URL used as-is. Null means no video attached.';
comment on column mindset_lessons.video_title is
  'Display title for an external (youtube) video — the video''s real, unedited title. Unused for uploaded videos, which use the lesson''s own title.';
comment on column mindset_lessons.video_source is
  'Creator/channel name for an external (youtube) video, e.g. "Identity SHIFT Hockey".';
comment on column mindset_lessons.video_note is
  'Short (1-2 sentence) editorial note on why this specific external video is relevant to this lesson. Admin-editable, never fabricated content from the source video itself.';

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type from information_schema.columns
--    where table_name = 'mindset_lessons' order by ordinal_position;
--   select id, video_type, video_url is not null as has_video from mindset_lessons;
-- ============================================================================
