-- ============================================================================
-- 0023 — FREE PREVIEW CONTENT FOR BRAND-NEW MEMBERS
--
-- Part of the "Custom" tab feature set. A brand-new authenticated member who
-- has purchased nothing gets a small, fixed free preview library:
--   * exactly 3 existing nutrition_recipes
--   * exactly 3 existing workout_plans routines
--   * the existing "Backhand to Forehand" training_resources video
--   * 1 existing mindset_lessons video
--
-- MECHANISM (no new column, no new table, no new RLS policy):
-- Every one of these tables already has a `required_tier tier_t` column and
-- an existing RLS read policy of the shape
--   (is_published/status='published' and auth_has_tier(required_tier)) or auth_is_staff()
-- and auth_has_tier() (0002) already special-cases 'none':
--   when required = 'none' then true
-- i.e. a row with required_tier = 'none' is visible to EVERY signed-in
-- profile unconditionally — no subscription_active check, no tier check.
-- Setting required_tier = 'none' on exactly these rows is therefore both
-- necessary and sufficient to make them free; nothing else grants access to
-- them, and nothing about any other row changes.
--
-- Rows are matched by slug/title, never by hardcoded UUID (Supabase
-- guidance), and every UPDATE is scoped so it can only ever touch the one
-- intended row. Purely additive/data-only: no DDL, no other table touched.
-- ============================================================================

-- ---- 3 meals ---------------------------------------------------------------
update nutrition_recipes
   set required_tier = 'none'
 where slug in ('chicken-rice-recovery-bowl', 'protein-overnight-oats', 'turkey-avocado-sandwich')
   and status = 'published';

-- ---- 3 workouts (situational routines — see lib/data.ts getWorkoutRoutines) -
update workout_plans
   set required_tier = 'none'
 where slug in ('pre-game-activation', 'quick-15-workout', 'recovery-day')
   and phase = 'routine'
   and is_published = true;

-- ---- the "Backhand to Forehand" training video ------------------------------
update training_resources
   set required_tier = 'none'
 where title = 'Backhand Recieve to Forehand Release'
   and is_published = true;

-- ---- 1 mindset video ---------------------------------------------------------
update mindset_lessons
   set required_tier = 'none'
 where slug = 'building-real-confidence'
   and is_published = true;

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select slug, title, required_tier from nutrition_recipes
--    where required_tier = 'none';                        -- expect exactly 3
--   select slug, title, required_tier from workout_plans
--    where required_tier = 'none';                         -- expect exactly 3
--   select title, required_tier from training_resources
--    where required_tier = 'none';                         -- expect exactly 1
--   select slug, title, required_tier from mindset_lessons
--    where required_tier = 'none';                         -- expect exactly 1
-- ============================================================================
