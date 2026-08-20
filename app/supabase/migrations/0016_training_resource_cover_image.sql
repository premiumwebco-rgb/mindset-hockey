-- ============================================================================
-- TRAINING RESOURCE COVER IMAGE  (Admin Mindset/Resources redesign)
--
-- Additive column only — no new table, no RLS change. training_resources'
-- existing RLS (0008: training_resources_staff_write/_update for writes,
-- training_resources_member_read for reads) already covers this column
-- because RLS is row-level, not column-level.
--
-- NAMED cover_image_url TO MATCH THE ADMIN UI'S OWN LANGUAGE, BUT IT HOLDS A
-- PRIVATE STORAGE PATH, NOT A PUBLIC URL. Exactly like storage_path on this
-- same table and thumbnail_path on mindset_lessons (0015), the
-- 'training-resources' bucket stays private — every read goes through a
-- short-lived signed URL minted server-side (lib storage helpers), never a
-- public link. Do not point this column at an external URL.
-- ============================================================================

alter table training_resources
  add column if not exists cover_image_url text;

comment on column training_resources.cover_image_url is
  'Storage path (under cover-images/) in the existing private training-resources bucket (0008) — reuses that bucket''s staff-write/member-read policies. Despite the _url name (for admin-UI consistency), this is never a public URL; resolved to a short-lived signed URL at read time, same as storage_path.';
