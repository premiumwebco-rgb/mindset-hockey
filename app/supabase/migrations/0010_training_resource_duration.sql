-- ============================================================================
-- 0010 — TRAINING RESOURCE DURATION
--
-- AUDIT FINDING
-- The library card design shows a running time, and `training_resources`
-- (0008) has no column for it. Everything else the library needs already
-- exists: title, description, kind, category, pillar (0009), required_tier,
-- is_published, sort_order, storage_path, size_bytes. This is the one genuine
-- gap, so it is the only thing this migration adds.
--
-- THIS COLUMN IS COSMETIC AND IS NOT A SECURITY CONTROL.
-- It is written from the browser at upload time (a <video> element reading its
-- own metadata) purely so the card can print "6:20". A wrong value mislabels a
-- card and nothing more.
--
-- It must NOT be confused with the AI Shot Analysis duration check. That one is
-- adversarial — a member has an incentive to understate a clip's length — so it
-- is verified server-side from the stored file's container header in
-- lib/ai/duration.ts and a client-supplied number is never trusted. Training
-- resources are uploaded by staff only, have no length limit at all, and there
-- is nothing to gain by lying about them.
--
-- Additive. No existing column, constraint, policy or row is changed.
-- ============================================================================

alter table training_resources
  add column if not exists duration_sec int;

-- Nonsense values are refused. NULL stays legal — duration is optional, and a
-- PDF or image has none. Ceiling is 24h, far above any real lesson, and exists
-- only to reject obvious garbage.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_resources_duration_check'
  ) then
    alter table training_resources
      add constraint training_resources_duration_check check (
        duration_sec is null or (duration_sec > 0 and duration_sec <= 86400)
      );
  end if;
end $$;

comment on column training_resources.duration_sec is
  'Optional running time in seconds, shown on the library card. Cosmetic only — captured in the browser at upload. NOT related to the adversarial 5-second AI Shot Analysis limit, which is verified server-side from the file itself.';

-- ---------------------------------------------------------------------------
-- RLS — unchanged.
--
-- The 0008 policies already govern this table (staff write; members read
-- published rows their tier covers). Adding a column does not change who may
-- read or write it, so no policy is touched.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type from information_schema.columns
--    where table_name = 'training_resources' and column_name = 'duration_sec';
--
--   -- must ERROR:
--   -- update training_resources set duration_sec = -5 where true;
-- ============================================================================
