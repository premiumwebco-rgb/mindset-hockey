-- ============================================================================
-- 0014 — AI COACHING DRILL RECOMMENDATION MAPPINGS
--
-- AUDIT FINDING
-- The only "recommendation" logic that exists today is
-- lib/ai/recommendations.ts's CATEGORY_SKILL_TAGS constant — a hardcoded
-- object literal mapping each AI rubric category to a fixed list of
-- training_resources.skill_tags values. That is a code-level lookup table,
-- not an admin-controlled one: changing which drill gets recommended for
-- "weight_transfer" requires a code deploy, and there is no priority
-- ordering when more than one drill could match.
--
-- No existing table models "category -> drill, in priority order" — grepped
-- the whole schema for ai_category / drill_recommend / category_drill and
-- found nothing. training_resources (0008) is reused as-is for the drill
-- side of the mapping (drill_id below IS a training_resources.id) — this
-- migration does NOT create a duplicate drill/content table, only the
-- mapping between an AI category and an existing drill.
--
-- FUTURE-PROOFING (not implemented yet, per the build spec)
-- `kind` lets a later phase add ai_category -> workout_plans or
-- ai_category -> nutrition_recipes or ai_category -> training video rows
-- without a schema change — just a different `kind` value and a resource_id
-- that points at a different table (enforced in application code, since a
-- single FK can't target three different tables). Only kind='drill',
-- pointing at training_resources, is used by this build.
--
-- Additive only. No existing table, column, policy or row is changed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------------
create table if not exists ai_drill_recommendations (
  id                  uuid primary key default gen_random_uuid(),

  -- Matches lib/ai/rubric.ts's CategoryKey exactly (the vision model's real
  -- rubric) — never lib/types.ts's separate coach-review RUBRIC. Constrained
  -- below so an admin cannot create a mapping for a category that doesn't exist.
  ai_category         text not null,

  -- Future-proofing only (see header). 'drill' is the only value written or
  -- read by this build's application code.
  recommendation_kind text not null default 'drill',

  -- The drill itself. Reuses training_resources (0008) — no duplicate
  -- content table. FK enforces the mapping can never point at a row that
  -- doesn't exist; ON DELETE CASCADE means deleting a drill quietly removes
  -- any mapping that recommended it, rather than leaving a dangling pointer.
  resource_id         uuid not null references training_resources(id) on delete cascade,

  -- Lower number = higher priority. The recommendation lookup takes the
  -- lowest-priority ACTIVE mapping for the weakest category.
  priority            int not null default 1,
  is_active           boolean not null default true,

  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint ai_drill_recommendations_category_check check (
    ai_category in (
      'setup_stance', 'weight_transfer', 'lower_body', 'hip_rotation',
      'shoulder_rotation', 'stick_loading', 'hand_position',
      'release_mechanics', 'follow_through', 'balance_stability'
    )
  ),
  constraint ai_drill_recommendations_kind_check check (
    recommendation_kind in ('drill', 'workout', 'nutrition', 'video')
  ),
  constraint ai_drill_recommendations_priority_check check (priority >= 1),

  -- The same drill cannot be mapped twice to the same category/kind — an
  -- admin re-adding one just edits priority/active on the existing row.
  unique (ai_category, recommendation_kind, resource_id)
);

create index if not exists ai_drill_recommendations_lookup_idx
  on ai_drill_recommendations (ai_category, recommendation_kind, is_active, priority);

comment on table ai_drill_recommendations is
  'Admin-controlled AI category -> drill mapping, priority-ordered. Read by lib/ai/recommendations.ts''s data-driven lookup (never a hardcoded category->title switch). Written only via the Admin > AI Coaching > Drill Recommendations screen.';

-- ---------------------------------------------------------------------------
-- 2. updated_at auto-touch, same convention as other admin-edited tables.
-- ---------------------------------------------------------------------------
create or replace function ai_drill_recommendations_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_drill_recommendations_set_updated_at on ai_drill_recommendations;
create trigger ai_drill_recommendations_set_updated_at
  before update on ai_drill_recommendations
  for each row execute function ai_drill_recommendations_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS
--
-- WRITE  ADMIN ONLY (auth_is_admin()) — Part 3 of the build spec is explicit
--        ("Only admins may access"), so this is stricter than
--        training_resources' own auth_is_staff() write policy. A coach can
--        still read active mappings (see below) but cannot create, edit,
--        reorder or disable one.
-- READ   any authenticated member may read ACTIVE mappings (this is a
--        config table, not user data or paid content itself — the drill it
--        points at is already tier-gated by training_resources' own RLS).
--        Staff (admin or coach) can additionally read inactive rows, for
--        visibility into the full mapping table even though only an admin
--        can change it.
-- ---------------------------------------------------------------------------
alter table ai_drill_recommendations enable row level security;

drop policy if exists ai_drill_recommendations_read on ai_drill_recommendations;
create policy ai_drill_recommendations_read on ai_drill_recommendations
  for select using (
    (is_active and auth.uid() is not null) or auth_is_staff()
  );

drop policy if exists ai_drill_recommendations_staff_write on ai_drill_recommendations;
create policy ai_drill_recommendations_staff_write on ai_drill_recommendations
  for all using (auth_is_admin()) with check (auth_is_admin());

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select column_name, data_type from information_schema.columns
--    where table_name = 'ai_drill_recommendations';
--
--   -- existing tables unaffected:
--   select count(*) from training_resources;
--
--   -- example mapping, once an admin adds one:
--   -- select ai_category, priority, is_active from ai_drill_recommendations
--   --  where ai_category = 'weight_transfer' order by priority;
-- ============================================================================
