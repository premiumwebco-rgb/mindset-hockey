-- ---------------------------------------------------------------------------
-- 0012 — ATHLETE NUTRITION COOKBOOK
--
-- A hockey-specific nutrition system: structured recipes, ingredients, tags,
-- per-player favourites, and the evidence-rated "Secret Sauce" library.
--
-- Modelled deliberately on training_resources (0008): tier_t gating,
-- staff-writes / entitled-members-read RLS, sort_order, created_by, and
-- timestamps. Nothing in this migration touches meal_plans,
-- nutrition_resources, or any existing table, policy, or function.
--
-- TWO DELIBERATE DEPARTURES FROM training_resources:
--
--   1. `status` (draft | published | archived) instead of an is_published
--      boolean. A boolean cannot express "archived" — an old recipe that
--      should stop appearing without being destroyed.
--
--   2. `nutrition_source` defaults to 'estimate'. Macros here are derived
--      from standard reference values for whole foods, NOT laboratory
--      analysis. The default makes it structurally impossible to render an
--      unverified macro as though it were sourced; the UI reads this column
--      to decide whether to print "Estimated nutrition". When a recipe is
--      later verified against USDA FoodData Central, flip it to 'usda'.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. RECIPES
-- ---------------------------------------------------------------------------
create table if not exists nutrition_recipes (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  description       text,
  -- Why a hockey player would actually reach for this. Shown above ingredients.
  why_it_works      text,
  -- One practical, hockey-specific takeaway. Shown at the bottom of detail.
  coach_tip         text,

  category          text not null,
  meal_type         text,
  -- Fuelling windows this fits, e.g. {'3-4h_before','30-60m_before'}.
  timing            text[] not null default '{}',

  prep_minutes      int,
  cook_minutes      int,
  servings          int not null default 1,

  calories          int,
  protein_g         int,
  carbs_g           int,
  fat_g             int,
  fiber_g           int,
  sodium_mg         int,
  -- 'estimate' until a real reference source is attached. See header note.
  nutrition_source  text not null default 'estimate'
                      check (nutrition_source in ('estimate','usda','verified')),

  difficulty        text check (difficulty in ('easy','moderate','advanced')),
  equipment         text[] not null default '{}',

  is_quick           boolean not null default false,
  is_make_ahead      boolean not null default false,
  is_travel_friendly boolean not null default false,
  is_pre_game        boolean not null default false,
  is_post_game       boolean not null default false,
  is_pre_practice    boolean not null default false,
  is_post_practice   boolean not null default false,
  is_pre_workout     boolean not null default false,
  is_post_workout    boolean not null default false,
  is_recovery        boolean not null default false,
  is_tournament      boolean not null default false,

  status            text not null default 'draft'
                      check (status in ('draft','published','archived')),
  required_tier     tier_t not null default 'premium',
  sort_order        int not null default 0,

  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table nutrition_recipes is
  'Hockey athlete cookbook. Staff write, entitled members read published rows.';
comment on column nutrition_recipes.nutrition_source is
  'estimate = derived from standard reference values, must be labelled as an estimate in the UI. usda/verified = sourced.';

-- ---------------------------------------------------------------------------
-- 2. INGREDIENTS
--    Relational rather than a JSON blob so a single measurement can be edited
--    in the admin UI without rewriting the whole recipe.
-- ---------------------------------------------------------------------------
create table if not exists nutrition_recipe_ingredients (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references nutrition_recipes(id) on delete cascade,
  name         text not null,
  quantity     numeric,
  unit         text,
  -- Household -> metric helper, e.g. '~170 g'. Display only.
  metric_note  text,
  optional     boolean not null default false,
  notes        text,
  sort_order   int not null default 0
);

-- ---------------------------------------------------------------------------
-- 3. TAGS
-- ---------------------------------------------------------------------------
create table if not exists nutrition_recipe_tags (
  recipe_id uuid not null references nutrition_recipes(id) on delete cascade,
  tag       text not null,
  primary key (recipe_id, tag)
);

-- ---------------------------------------------------------------------------
-- 4. INSTRUCTIONS
--    Stored as ordered rows so steps can be reordered/edited individually.
-- ---------------------------------------------------------------------------
create table if not exists nutrition_recipe_steps (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references nutrition_recipes(id) on delete cascade,
  body       text not null,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- 5. FAVOURITES  ("My Go-To Meals")
--    User-owned rows. Distinct RLS shape from the rest of this migration.
-- ---------------------------------------------------------------------------
create table if not exists nutrition_recipe_favorites (
  profile_id uuid not null references profiles(id) on delete cascade,
  recipe_id  uuid not null references nutrition_recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- 6. SECRET SAUCE
-- ---------------------------------------------------------------------------
create table if not exists nutrition_secret_sauce (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  category          text,
  what_it_is        text,
  why_it_may_work   text,
  when_to_use       text,
  how_to_use        text,
  dosage            text,
  who_should_avoid  text,
  side_effects      text,
  practical_example text,
  evidence_rating   text not null default 'limited'
                      check (evidence_rating in ('strong','moderate','emerging','limited')),
  status            text not null default 'draft'
                      check (status in ('draft','published','archived')),
  required_tier     tier_t not null default 'premium',
  sort_order        int not null default 0,
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. SOURCES
--    url and doi are intentionally NULLABLE. Citations are recorded as
--    organization + title + year only; a verified link can be added later
--    through the admin UI. Never populate these with unverified values.
-- ---------------------------------------------------------------------------
create table if not exists nutrition_secret_sauce_sources (
  id               uuid primary key default gen_random_uuid(),
  secret_sauce_id  uuid not null references nutrition_secret_sauce(id) on delete cascade,
  organization     text not null,
  title            text not null,
  publication_year int,
  source_type      text,
  url              text,
  doi              text,
  sort_order       int not null default 0
);

-- ---------------------------------------------------------------------------
-- 8. INDEXES
-- ---------------------------------------------------------------------------
create index if not exists nutrition_recipes_status_category_idx
  on nutrition_recipes (status, category);
create index if not exists nutrition_recipes_status_sort_idx
  on nutrition_recipes (status, sort_order, title);
create index if not exists nutrition_recipes_timing_idx
  on nutrition_recipes using gin (timing);
-- Server-side search over title + description, so the browser never has to
-- download the whole cookbook to filter it.
create index if not exists nutrition_recipes_search_idx
  on nutrition_recipes using gin (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  );

create index if not exists nutrition_recipe_ingredients_recipe_idx
  on nutrition_recipe_ingredients (recipe_id, sort_order);
create index if not exists nutrition_recipe_steps_recipe_idx
  on nutrition_recipe_steps (recipe_id, sort_order);
create index if not exists nutrition_recipe_tags_tag_idx
  on nutrition_recipe_tags (tag);
create index if not exists nutrition_recipe_favorites_profile_idx
  on nutrition_recipe_favorites (profile_id);

create index if not exists nutrition_secret_sauce_status_idx
  on nutrition_secret_sauce (status, sort_order);
create index if not exists nutrition_secret_sauce_sources_parent_idx
  on nutrition_secret_sauce_sources (secret_sauce_id, sort_order);

-- ---------------------------------------------------------------------------
-- 9. updated_at maintenance
--    No such helper existed in this database; this one is created fresh and is
--    only ever attached to tables introduced by this migration.
-- ---------------------------------------------------------------------------
create or replace function nutrition_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_nutrition_recipes_updated on nutrition_recipes;
create trigger trg_nutrition_recipes_updated
  before update on nutrition_recipes
  for each row execute function nutrition_touch_updated_at();

drop trigger if exists trg_nutrition_secret_sauce_updated on nutrition_secret_sauce;
create trigger trg_nutrition_secret_sauce_updated
  before update on nutrition_secret_sauce
  for each row execute function nutrition_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
--
--     Same shape as training_resources: a member sees a row only when it is
--     published AND their tier entitles them; staff see everything and are the
--     only writers. Child tables (ingredients/steps/tags/sources) do not carry
--     their own tier column — they inherit visibility from their parent via
--     EXISTS, so a member can never read the ingredients of a draft recipe.
--
--     Favourites are the exception: they are user-owned and scoped to
--     auth.uid(), so one member can never read or modify another's.
-- ---------------------------------------------------------------------------
alter table nutrition_recipes                enable row level security;
alter table nutrition_recipe_ingredients     enable row level security;
alter table nutrition_recipe_steps           enable row level security;
alter table nutrition_recipe_tags            enable row level security;
alter table nutrition_recipe_favorites       enable row level security;
alter table nutrition_secret_sauce           enable row level security;
alter table nutrition_secret_sauce_sources   enable row level security;

-- ---- recipes ---------------------------------------------------------------
drop policy if exists nutrition_recipes_read on nutrition_recipes;
create policy nutrition_recipes_read on nutrition_recipes
  for select using (
    (status = 'published' and auth_has_tier(required_tier)) or auth_is_staff()
  );

drop policy if exists nutrition_recipes_staff_write on nutrition_recipes;
create policy nutrition_recipes_staff_write on nutrition_recipes
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- ingredients / steps / tags (visibility inherited from parent) ---------
drop policy if exists nutrition_ingredients_read on nutrition_recipe_ingredients;
create policy nutrition_ingredients_read on nutrition_recipe_ingredients
  for select using (
    exists (
      select 1 from nutrition_recipes r
      where r.id = recipe_id
        and ((r.status = 'published' and auth_has_tier(r.required_tier)) or auth_is_staff())
    )
  );

drop policy if exists nutrition_ingredients_staff_write on nutrition_recipe_ingredients;
create policy nutrition_ingredients_staff_write on nutrition_recipe_ingredients
  for all using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists nutrition_steps_read on nutrition_recipe_steps;
create policy nutrition_steps_read on nutrition_recipe_steps
  for select using (
    exists (
      select 1 from nutrition_recipes r
      where r.id = recipe_id
        and ((r.status = 'published' and auth_has_tier(r.required_tier)) or auth_is_staff())
    )
  );

drop policy if exists nutrition_steps_staff_write on nutrition_recipe_steps;
create policy nutrition_steps_staff_write on nutrition_recipe_steps
  for all using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists nutrition_tags_read on nutrition_recipe_tags;
create policy nutrition_tags_read on nutrition_recipe_tags
  for select using (
    exists (
      select 1 from nutrition_recipes r
      where r.id = recipe_id
        and ((r.status = 'published' and auth_has_tier(r.required_tier)) or auth_is_staff())
    )
  );

drop policy if exists nutrition_tags_staff_write on nutrition_recipe_tags;
create policy nutrition_tags_staff_write on nutrition_recipe_tags
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- favourites (user-owned) ----------------------------------------------
drop policy if exists nutrition_favorites_own on nutrition_recipe_favorites;
create policy nutrition_favorites_own on nutrition_recipe_favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---- secret sauce ----------------------------------------------------------
drop policy if exists nutrition_secret_sauce_read on nutrition_secret_sauce;
create policy nutrition_secret_sauce_read on nutrition_secret_sauce
  for select using (
    (status = 'published' and auth_has_tier(required_tier)) or auth_is_staff()
  );

drop policy if exists nutrition_secret_sauce_staff_write on nutrition_secret_sauce;
create policy nutrition_secret_sauce_staff_write on nutrition_secret_sauce
  for all using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists nutrition_sources_read on nutrition_secret_sauce_sources;
create policy nutrition_sources_read on nutrition_secret_sauce_sources
  for select using (
    exists (
      select 1 from nutrition_secret_sauce s
      where s.id = secret_sauce_id
        and ((s.status = 'published' and auth_has_tier(s.required_tier)) or auth_is_staff())
    )
  );

drop policy if exists nutrition_sources_staff_write on nutrition_secret_sauce_sources;
create policy nutrition_sources_staff_write on nutrition_secret_sauce_sources
  for all using (auth_is_staff()) with check (auth_is_staff());
