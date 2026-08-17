-- ============================================================================
-- 0013 — TRAINING RESOURCE SKILL TAGS (AI recommendation support)
--
-- AUDIT FINDING
-- training_resources (0008, 0009, 0010) has no way to say which AI Shot
-- Analysis rubric categories a video actually addresses. The AI recommendation
-- feature (Phase 4) needs exactly that: "this video is relevant to
-- release_mechanics" or "...to weight_transfer". A free-text column cannot be
-- queried with a single indexed overlap check, and a separate mapping table
-- is unnecessary complexity for what is fundamentally a tag list on a video.
--
-- `skill_tags` is nullable text[]. NULL/empty means "not yet tagged for
-- recommendations" — an existing or newly-created resource that has not been
-- tagged simply never surfaces as a recommendation; it stays fully visible
-- and playable everywhere else (the library, pillar browsing) exactly as
-- before. This is why the column is safe to add with zero backfill: nothing
-- currently reads it, so no existing row's behavior changes.
--
-- Additive only. No existing column, constraint, policy or row is changed.
-- No rows currently exist in production training_resources (confirmed at
-- migration time), so there is nothing to backfill regardless.
-- ============================================================================

alter table training_resources
  add column if not exists skill_tags text[];

comment on column training_resources.skill_tags is
  'Tags matching AI Shot Analysis rubric categories (see app/lib/ai/rubric.ts CategoryKey) and free-form skill tags (e.g. quick-release, shooting-power). Nullable — untagged rows are simply never recommended, and are otherwise unaffected. Driven by app/lib/ai/recommendations.ts.';

-- ---------------------------------------------------------------------------
-- INDEX
--
-- Recommendation lookups filter on `skill_tags && $1` (overlap) against a
-- small tag list computed from one shot analysis. GIN is the standard index
-- type for array-overlap queries in Postgres.
-- ---------------------------------------------------------------------------
create index if not exists training_resources_skill_tags_idx
  on training_resources using gin (skill_tags);

-- ---------------------------------------------------------------------------
-- RLS — unchanged
--
-- The policies from 0008 already cover this table: staff write, entitled
-- members read published rows only. Adding a column does not change who may
-- read or write it, so no policy is touched here.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type, udt_name from information_schema.columns
--    where table_name = 'training_resources' and column_name = 'skill_tags';
--
--   -- existing rows unaffected (must equal the pre-migration count):
--   select count(*) from training_resources;
--
--   -- overlap query shape used by the recommendation feature:
--   -- select id, title from training_resources
--   --  where is_published and skill_tags && array['release_mechanics','quick-release'];
-- ============================================================================
