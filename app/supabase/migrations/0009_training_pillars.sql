-- ============================================================================
-- 0009 — SIX PILLARS FOR TRAINING RESOURCES
--
-- AUDIT FINDING
-- `training_resources` (0008) has a free-text `category` column. Free text
-- cannot express "exactly one of six" — it permits NULL, typos ('Mechanics'
-- vs 'mechanics'), and invented values. The library's guiding rule is that
-- nothing is loose and nothing is uncategorized, so the constraint has to live
-- in the database rather than in a form.
--
-- The six pillars already exist in the application as `PILLARS` in
-- lib/types.ts and drive /library. This migration makes the database agree
-- with them.
--
-- `category` is KEPT, not replaced. It stays useful as a free-text sub-grouping
-- inside a pillar (e.g. pillar='mechanics', category='Release'). The pillar is
-- the controlled axis; the category is the loose one.
--
-- Additive. No existing column is dropped and no data is deleted.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PILLAR COLUMN
--
-- Nullable at first so the migration cannot fail on rows that predate it. The
-- backfill below assigns every existing row, and the constraint after that
-- makes a missing pillar impossible for anything published.
-- ---------------------------------------------------------------------------
alter table training_resources
  add column if not exists pillar text;

-- ---------------------------------------------------------------------------
-- 2. ONLY THE SIX PILLARS ARE VALID
--
-- Enforced by the database, so an invalid pillar cannot be written by the API,
-- by a direct PostgREST call, or by hand in the table editor. NULL is allowed
-- only while a resource is still a draft — see the publish rule below.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_resources_pillar_check'
  ) then
    alter table training_resources
      add constraint training_resources_pillar_check check (
        pillar is null or pillar in (
          'mindset', 'mechanics', 'skill', 'systems', 'habits', 'leadership'
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. NOTHING PUBLISHED WITHOUT A PILLAR
--
-- "There should never be an uncategorized training lesson." A draft may sit
-- without one while it is being written; the moment it goes live it must be
-- filed. This is what guarantees the library can never show a loose lesson.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_resources_published_needs_pillar'
  ) then
    alter table training_resources
      add constraint training_resources_published_needs_pillar check (
        is_published = false or pillar is not null
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. BACKFILL EXISTING ROWS
--
-- Maps whatever is in the free-text `category` onto a pillar where it can be
-- read confidently. Anything that cannot be matched is left NULL and stays a
-- draft rather than being guessed into the wrong pillar — a lesson filed under
-- the wrong pillar is worse than one an admin has to file by hand.
--
-- Runs only where pillar is still null, so it is safe to re-run.
-- ---------------------------------------------------------------------------
update training_resources
   set pillar = case
     when lower(coalesce(category, '')) like '%mindset%'    then 'mindset'
     when lower(coalesce(category, '')) like '%mechanic%'   then 'mechanics'
     when lower(coalesce(category, '')) like '%shoot%'      then 'mechanics'
     when lower(coalesce(category, '')) like '%skill%'      then 'skill'
     when lower(coalesce(category, '')) like '%hands%'      then 'skill'
     when lower(coalesce(category, '')) like '%edges%'      then 'skill'
     when lower(coalesce(category, '')) like '%system%'     then 'systems'
     when lower(coalesce(category, '')) like '%season%'     then 'systems'
     when lower(coalesce(category, '')) like '%habit%'      then 'habits'
     when lower(coalesce(category, '')) like '%routine%'    then 'habits'
     when lower(coalesce(category, '')) like '%leader%'     then 'leadership'
     when lower(coalesce(category, '')) like '%coach%'      then 'leadership'
     else null
   end
 where pillar is null;

-- Anything the backfill could not place is forced back to draft so it cannot
-- appear in the library uncategorized. The admin re-files it and republishes.
update training_resources
   set is_published = false
 where pillar is null and is_published = true;

-- ---------------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------------

-- Drives the per-pillar library view and its counts.
create index if not exists training_resources_pillar_idx
  on training_resources (pillar, sort_order)
  where is_published = true;

-- Drives the admin console, which groups drafts and live rows by pillar.
create index if not exists training_resources_admin_pillar_idx
  on training_resources (pillar, created_at desc);

comment on column training_resources.pillar is
  'Exactly one of the six pillars: mindset | mechanics | skill | systems | habits | leadership. Required before a resource can be published.';
comment on column training_resources.category is
  'Optional free-text sub-grouping WITHIN a pillar (e.g. pillar=mechanics, category=Release). Never a substitute for the pillar.';

-- ---------------------------------------------------------------------------
-- 6. RLS — unchanged
--
-- The policies from 0008 already cover this table: staff write, entitled
-- members read published rows only. Adding a column does not change who may
-- read or write, so no policy is touched here. Members still cannot set or
-- change a pillar, because they have no write path to the table at all.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- VERIFY
-- ============================================================================
--   -- nothing published without a pillar (must return 0)
--   select count(*) from training_resources
--    where is_published = true and pillar is null;
--
--   -- library counts, exactly as the UI computes them
--   select pillar, count(*) from training_resources
--    where is_published = true group by pillar order by pillar;
--
--   -- invalid values are impossible; this must ERROR:
--   -- insert into training_resources (title, storage_path, pillar)
--   --   values ('x', 'x', 'nonsense');
-- ============================================================================
