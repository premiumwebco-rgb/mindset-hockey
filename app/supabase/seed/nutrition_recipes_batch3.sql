-- ============================================================================
-- NUTRITION COOKBOOK — RECIPE BATCH 3 (19 recipes)
--
-- Plain SQL seed, not a migration — same pattern as batch 1 (11 recipes) and
-- batch 2 (15 recipes). No schema change: every column used here already
-- exists (nutrition_recipes, nutrition_recipe_ingredients,
-- nutrition_recipe_steps, nutrition_recipe_tags).
--
-- Targets the gaps found auditing the post-batch-2 catalog (26 recipes):
--   - category = 'recovery' had ZERO rows (recovery content existed only as
--     the is_recovery flag on rows filed under other categories) -> +3
--   - smoothies, pre_practice, post_practice, pre_workout, post_workout,
--     road, tournament each had only 2 rows -> +2 each (16 total)
--   - snacks had only 1 row -> +2
-- 3 + (2 * 8) = 19 new recipes. 26 + 19 = 45 total, at the top of the
-- requested 40-45 range.
--
-- All required_tier = 'premium' and status = 'published', matching every
-- existing recipe row. All nutrition numbers are estimates
-- (nutrition_source default = 'estimate') — no fabricated citations.
-- ============================================================================

insert into nutrition_recipes
  (slug, title, description, why_it_works, coach_tip, category, meal_type, timing,
   prep_minutes, cook_minutes, servings, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg,
   difficulty, equipment, is_quick, is_make_ahead, is_travel_friendly,
   is_pre_game, is_post_game, is_pre_practice, is_post_practice, is_pre_workout, is_post_workout,
   is_recovery, is_tournament, status, required_tier, sort_order)
values
  ('cottage-cheese-pineapple-recovery-bowl', 'Cottage Cheese & Pineapple Recovery Bowl',
   'A cold, five-minute bowl built around slow-digesting protein and quick carbs for right after a hard session.',
   'Cottage cheese is mostly casein protein, which digests slowly and keeps amino acids available for hours — useful on a night with no time for a second meal. Pineapple adds fast carbs and vitamin C without much fiber to slow things down.',
   'Buy the small single-serving cottage cheese cups — no mixing bowl, no cleanup, easy to keep several in a rink cooler.',
   'recovery', 'snack', array['immediately_after','1-2h_after'],
   5, 0, 1, 260, 24, 28, 6, 2, 380,
   'easy', array[]::text[], true, false, true,
   false, true, false, true, false, false, true, false, 'published', 'premium', 260),

  ('recovery-rice-pudding', 'Recovery Rice Pudding with Berries',
   'A make-ahead pudding that reads like dessert but is built to refill glycogen and protein after a heavy training block.',
   'Rice is a dense carbohydrate that helps restock muscle glycogen, and cooking it in milk with a scoop of protein powder stirred in after cooking adds real protein without changing the texture much.',
   'Make a full batch on Sunday and portion it into containers — a spoon-ready recovery food beats scrambling to cook something at 9pm after a game.',
   'recovery', 'snack', array['1-2h_after','immediately_after'],
   10, 20, 4, 320, 18, 52, 5, 2, 140,
   'easy', array['pot'], false, true, true,
   false, true, false, true, false, false, true, false, 'published', 'premium', 270),

  ('tart-cherry-yogurt-recovery-parfait', 'Tart Cherry & Greek Yogurt Recovery Parfait',
   'A layered parfait built around tart cherries, one of the few foods with some research behind it for easing post-exercise soreness.',
   'Tart cherries contain natural compounds studied for reducing exercise-induced inflammation and soreness, and pairing them with Greek yogurt adds the protein a recovery snack should have anyway.',
   'Frozen tart cherries (or tart cherry juice) work fine here and are usually cheaper than fresh — thaw them for a few minutes before layering.',
   'recovery', 'snack', array['1-2h_after'],
   5, 0, 1, 280, 22, 34, 6, 3, 90,
   'easy', array[]::text[], true, false, true,
   false, false, false, true, false, false, true, false, 'published', 'premium', 280),

  ('mango-protein-smoothie', 'Mango Protein Smoothie',
   'A tropical, lighter alternative to the berry smoothie for a pre-practice snack that won''t sit heavy.',
   'Mango is mostly fast carbs with very little fat or fiber, so it clears the stomach quickly, and a scoop of protein powder rounds it out without adding bulk that slows digestion.',
   'Frozen mango chunks blend just as well as fresh and mean there''s always a bag ready in the freezer.',
   'smoothies', 'snack', array['1-2h_before','2-3h_before'],
   5, 0, 1, 290, 26, 40, 4, 3, 120,
   'easy', array['blender'], true, false, true,
   false, false, true, false, false, false, false, false, 'published', 'premium', 290),

  ('pb-banana-recovery-smoothie', 'Peanut Butter Banana Recovery Smoothie',
   'A thicker, higher-calorie smoothie for a player who needs more than a light shake after a hard lift.',
   'Peanut butter adds fat and a bit more protein and calories than a fruit-only smoothie provides, which suits a bigger post-workout calorie need without needing to eat a full meal immediately.',
   'If you''re trying to gain weight for the season, this is an easy 500-calorie add-on rather than a replacement for a real meal.',
   'smoothies', 'snack', array['immediately_after','1-2h_after'],
   5, 0, 1, 480, 30, 48, 18, 5, 220,
   'easy', array['blender'], true, false, false,
   false, false, false, false, false, true, true, false, 'published', 'premium', 300),

  ('turkey-cheese-quesadilla-pre-practice', 'Turkey & Cheese Quesadilla (Pre-Practice)',
   'A warm, handheld option for a player who wants something more substantial than a smoothie before practice.',
   'Turkey and cheese provide protein while the tortilla gives fast-digesting carbs, and the whole thing is pan-fried into something that''s easy to eat in the car on the way to the rink.',
   'Cut it into strips instead of wedges — easier to eat one-handed while getting gear together.',
   'pre_practice', 'lunch', array['2-3h_before','1-2h_before'],
   5, 6, 1, 460, 32, 42, 16, 2, 620,
   'easy', array['pan'], true, false, true,
   false, false, true, false, false, false, false, false, 'published', 'premium', 310),

  ('apple-almond-butter-energy-bites', 'Apple & Almond Butter Energy Bites (Pre-Practice)',
   'No-bake bites built to be made ahead in batches and grabbed on the way out the door before practice.',
   'Oats and dried apple provide steady carbs, and almond butter adds a bit of fat and protein to slow digestion just enough to avoid a sugar crash mid-practice.',
   'Roll a double batch and freeze half — they thaw in about 15 minutes at room temperature.',
   'pre_practice', 'snack', array['1-2h_before','2-3h_before'],
   15, 0, 6, 210, 6, 26, 9, 3, 60,
   'easy', array['mixing bowl'], true, true, true,
   false, false, true, false, false, false, false, false, 'published', 'premium', 320),

  ('post-practice-turkey-wrap', 'Post-Practice Turkey Wrap',
   'A simple wrap sized to refuel after practice without needing to cook when everyone just wants to get home.',
   'Turkey and cheese in a tortilla covers protein and carbs in one handheld item, digesting easily enough to eat in the car on the way home from the rink.',
   'Pack it in foil before you leave for practice so it''s ready to eat the second you''re off the ice, not 40 minutes later at home.',
   'post_practice', 'lunch', array['immediately_after','1-2h_after'],
   8, 0, 1, 420, 30, 38, 14, 3, 780,
   'easy', array[]::text[], true, true, true,
   false, false, false, true, false, false, true, false, 'published', 'premium', 330),

  ('post-practice-smoothie-bowl', 'Post-Practice Protein Smoothie Bowl',
   'A thicker, spoon-eaten version of a recovery smoothie for a player who wants something that feels like a real snack, not just a drink.',
   'Blending less liquid than a normal smoothie makes it thick enough to eat with a spoon and top with extras, while still hitting the same protein-and-carb recovery target as a drinkable shake.',
   'Prep the toppings (granola, banana slices) in small containers the night before so this comes together in under five minutes after practice.',
   'post_practice', 'snack', array['immediately_after'],
   6, 0, 1, 340, 26, 44, 7, 5, 130,
   'easy', array['blender'], true, false, false,
   false, false, false, true, false, false, true, false, 'published', 'premium', 340),

  ('dates-almond-butter-energy-balls', 'Dates & Almond Butter Energy Balls (Pre-Workout)',
   'A concentrated, fast-carb bite for the 30-60 minutes before a lift, made ahead in batches.',
   'Dates are almost pure fast-digesting sugar, giving quick, available energy right before training, while a small amount of almond butter holds them together without adding enough fat to slow digestion much.',
   'Two bites is usually plenty this close to training — this is a top-off, not a meal.',
   'pre_workout', 'snack', array['30-60m_before'],
   15, 0, 6, 160, 4, 26, 6, 3, 20,
   'easy', array['food processor'], true, true, true,
   false, false, false, false, true, false, false, false, 'published', 'premium', 350),

  ('honey-banana-toast-pre-workout', 'Pre-Workout Toast with Honey & Banana',
   'A lighter, faster alternative to the peanut-butter toast for a player whose stomach prefers less fat before lifting.',
   'This version leans almost entirely on fast carbs from the honey and banana with very little fat or fiber, which digests quickly and lowers the odds of stomach trouble mid-set.',
   'If the peanut-butter toast has ever felt heavy before a lift, swap to this version instead.',
   'pre_workout', 'snack', array['30-60m_before','1-2h_before'],
   4, 2, 1, 250, 5, 52, 3, 3, 200,
   'easy', array['toaster'], true, false, true,
   false, false, false, false, true, false, false, false, 'published', 'premium', 360),

  ('post-workout-chicken-sweet-potato-bowl', 'Post-Workout Chicken & Sweet Potato Bowl',
   'A balanced, sit-down recovery meal for after a strength or speed session, built around lean protein and a slower-digesting carb.',
   'Chicken supplies a clean protein hit for muscle repair, and sweet potato brings complex carbs plus fiber and potassium to help restock glycogen and replace what''s lost in sweat.',
   'Roast a full tray of sweet potato cubes on Sunday — they reheat well and turn this into a five-minute bowl on a weeknight.',
   'post_workout', 'dinner', array['1-2h_after'],
   10, 25, 2, 520, 42, 48, 14, 6, 380,
   'moderate', array['pan','oven'], false, true, false,
   false, false, false, false, false, true, true, false, 'published', 'premium', 370),

  ('post-workout-berry-protein-shake', 'Post-Workout Protein Shake with Berries',
   'A fast, no-fuss shake for the gap between finishing a lift and getting to a real meal.',
   'A fast-absorbing protein source right after training helps start muscle repair sooner, and the berries add carbs and antioxidants without much added sugar.',
   'Keep protein powder and a shaker bottle in your gym bag so this happens automatically instead of depending on remembering to pack it.',
   'post_workout', 'snack', array['immediately_after'],
   3, 0, 1, 260, 28, 30, 4, 4, 110,
   'easy', array['shaker bottle or blender'], true, false, true,
   false, false, false, false, false, true, true, false, 'published', 'premium', 380),

  ('make-ahead-trail-mix', 'Make-Ahead Trail Mix (Road)',
   'A simple mix built to survive a hockey bag for days, for the stretches where a real meal isn''t available between rinks.',
   'Nuts and dried fruit travel without refrigeration and combine fat, protein and carbs in one bag, which beats relying on vending-machine options during a long road trip.',
   'Portion it into single-serving bags at home — it''s too easy to eat the whole batch in one sitting straight from a big bag.',
   'road', 'snack', array['2-3h_before','1-2h_after'],
   8, 0, 6, 220, 7, 22, 13, 3, 90,
   'easy', array[]::text[], true, true, true,
   false, false, false, false, false, false, false, false, 'published', 'premium', 390),

  ('cooler-bag-tournament-lunch', 'Cooler Bag Tournament Lunch (Road)',
   'A pack-from-home lunch built for a tournament day when the rink concession is the only nearby option.',
   'Packing a real lunch avoids defaulting to fried rink food between games, and a soft cooler with an ice pack keeps sandwich fillings and fruit safe for several hours in a car or rink lobby.',
   'Freeze a water bottle the night before and pack it in the cooler — it doubles as an ice pack and is thawed enough to drink by lunch.',
   'road', 'lunch', array['2-3h_before','1-2h_before'],
   12, 0, 1, 480, 28, 52, 16, 5, 640,
   'easy', array['small cooler'], false, true, true,
   false, false, false, false, false, false, false, true, 'published', 'premium', 400),

  ('tournament-pasta-salad', 'Tournament Pasta Salad (Make-Ahead)',
   'A cold pasta salad made the night before a tournament, meant to be eaten cold or at room temperature between games.',
   'Pasta holds up well made a day ahead and eaten cold, unlike most hot meals, and this version includes enough protein from chicken and cheese that it works as a real between-game meal, not just a side dish.',
   'Make it the night before the tournament starts — the flavors are actually better after sitting overnight in the fridge.',
   'tournament', 'lunch', array['2-3h_before','1-2h_before'],
   15, 12, 4, 460, 26, 54, 14, 4, 520,
   'easy', array['pot'], false, true, true,
   false, false, false, false, false, false, false, true, 'published', 'premium', 410),

  ('between-game-protein-bar-fruit-plate', 'Between-Game Protein Bar & Fruit Plate',
   'The simplest possible between-game option for a day with almost no time to prepare anything.',
   'A quality protein bar plus a piece of whole fruit covers protein and carbs in under a minute of prep, which matters when the gap between games is barely enough time to sit down.',
   'Read the label on the bar — look for one closer to 20g protein than one that''s mostly a candy bar with a health claim on the wrapper.',
   'tournament', 'snack', array['1-2h_before'],
   2, 0, 1, 320, 20, 38, 10, 4, 220,
   'easy', array[]::text[], true, false, true,
   false, false, false, false, false, false, false, true, 'published', 'premium', 420),

  ('make-ahead-protein-muffins', 'Make-Ahead Protein Muffins (Snack)',
   'A baked-ahead muffin built to be a grab-and-go snack all week instead of a one-time recipe.',
   'Baking protein powder and oats into a muffin turns a normally carb-only snack into one with a real protein number, and a batch made Sunday covers snacks for most of the week.',
   'Store extras in the freezer — a frozen muffin thaws on the counter in about an hour or in a bag on the way to the rink.',
   'snacks', 'snack', array['1-2h_before','1-2h_after'],
   15, 20, 12, 180, 9, 22, 6, 2, 160,
   'easy', array['muffin tin','oven'], false, true, true,
   false, false, false, false, false, false, false, false, 'published', 'premium', 430),

  ('apple-nachos-snack', 'Quick Apple Nachos (Snack)',
   'A fast, no-cook snack that turns apple slices into something closer to a treat, without much added sugar.',
   'Apple provides fiber and fluid, peanut butter adds protein and fat to make it more filling, and a light scatter of granola adds crunch without turning it into dessert.',
   'Toss the apple slices in a little lemon juice first if you''re prepping them more than 20 minutes ahead — it keeps them from browning.',
   'snacks', 'snack', array['1-2h_before','1-2h_after'],
   5, 0, 1, 240, 6, 34, 10, 5, 60,
   'easy', array[]::text[], true, false, false,
   false, false, false, false, false, false, false, false, 'published', 'premium', 440);

-- ----------------------------------------------------------------------------
-- INGREDIENTS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_ingredients (recipe_id, name, quantity, unit, metric_note, optional, notes, sort_order)
select r.id, v.name, v.quantity::numeric, v.unit, v.metric_note, v.optional, v.notes, v.sort_order
from (values
  ('cottage-cheese-pineapple-recovery-bowl','cottage cheese','1','cup','~225 g',false,null,1),
  ('cottage-cheese-pineapple-recovery-bowl','pineapple chunks','0.75','cup','~120 g',false,null,2),
  ('cottage-cheese-pineapple-recovery-bowl','honey','1','tsp',null,true,null,3),

  ('recovery-rice-pudding','cooked white rice','2','cups','~370 g',false,null,1),
  ('recovery-rice-pudding','milk','2','cups','~475 ml',false,null,2),
  ('recovery-rice-pudding','vanilla protein powder','1','scoop','~30 g',false,'Stir in after cooking, once the pudding has cooled slightly.',3),
  ('recovery-rice-pudding','honey','2','tbsp',null,false,null,4),
  ('recovery-rice-pudding','cinnamon','0.5','tsp',null,true,null,5),
  ('recovery-rice-pudding','mixed berries','1','cup','~150 g',false,'For topping.',6),

  ('tart-cherry-yogurt-recovery-parfait','plain Greek yogurt','1','cup','~225 g',false,null,1),
  ('tart-cherry-yogurt-recovery-parfait','frozen tart cherries (thawed) or tart cherry juice','0.5','cup','~75 g',false,null,2),
  ('tart-cherry-yogurt-recovery-parfait','granola','0.25','cup','~25 g',true,null,3),
  ('tart-cherry-yogurt-recovery-parfait','honey','1','tsp',null,true,null,4),

  ('mango-protein-smoothie','frozen mango chunks','1','cup','~150 g',false,null,1),
  ('mango-protein-smoothie','milk or milk alternative','1','cup','~240 ml',false,null,2),
  ('mango-protein-smoothie','vanilla protein powder','1','scoop','~30 g',false,null,3),
  ('mango-protein-smoothie','lime juice','1','tsp',null,true,null,4),

  ('pb-banana-recovery-smoothie','banana','1','large',null,false,null,1),
  ('pb-banana-recovery-smoothie','milk','1','cup','~240 ml',false,null,2),
  ('pb-banana-recovery-smoothie','peanut butter','2','tbsp','~32 g',false,null,3),
  ('pb-banana-recovery-smoothie','vanilla or chocolate protein powder','1','scoop','~30 g',false,null,4),

  ('turkey-cheese-quesadilla-pre-practice','flour tortilla (large)','1','tortilla',null,false,null,1),
  ('turkey-cheese-quesadilla-pre-practice','sliced turkey','3','oz','~85 g',false,null,2),
  ('turkey-cheese-quesadilla-pre-practice','shredded cheese','0.5','cup','~55 g',false,null,3),
  ('turkey-cheese-quesadilla-pre-practice','olive oil or butter','1','tsp',null,true,null,4),

  ('apple-almond-butter-energy-bites','rolled oats','1','cup','~90 g',false,null,1),
  ('apple-almond-butter-energy-bites','almond butter','0.5','cup','~130 g',false,null,2),
  ('apple-almond-butter-energy-bites','dried apple, chopped','0.33','cup','~40 g',false,null,3),
  ('apple-almond-butter-energy-bites','honey','2','tbsp',null,false,null,4),
  ('apple-almond-butter-energy-bites','cinnamon','0.5','tsp',null,true,null,5),

  ('post-practice-turkey-wrap','large tortilla','1','tortilla',null,false,null,1),
  ('post-practice-turkey-wrap','sliced turkey','4','oz','~115 g',false,null,2),
  ('post-practice-turkey-wrap','sliced cheese','1','slice',null,false,null,3),
  ('post-practice-turkey-wrap','lettuce and tomato','1','handful',null,true,null,4),
  ('post-practice-turkey-wrap','mustard or mayo','1','tbsp',null,true,null,5),

  ('post-practice-smoothie-bowl','frozen banana','1','large','~120 g',false,null,1),
  ('post-practice-smoothie-bowl','milk or milk alternative','0.5','cup','~120 ml',false,'Use less liquid than a drinkable smoothie so it stays spoon-thick.',2),
  ('post-practice-smoothie-bowl','vanilla protein powder','1','scoop','~30 g',false,null,3),
  ('post-practice-smoothie-bowl','granola','0.25','cup','~25 g',true,'For topping.',4),
  ('post-practice-smoothie-bowl','sliced banana or berries','0.25','cup',null,true,'For topping.',5),

  ('dates-almond-butter-energy-balls','pitted dates','1','cup','~150 g',false,null,1),
  ('dates-almond-butter-energy-balls','almond butter','0.33','cup','~85 g',false,null,2),
  ('dates-almond-butter-energy-balls','rolled oats','0.5','cup','~45 g',false,null,3),
  ('dates-almond-butter-energy-balls','sea salt','1','pinch',null,true,null,4),

  ('honey-banana-toast-pre-workout','whole wheat bread','2','slices',null,false,null,1),
  ('honey-banana-toast-pre-workout','banana','1','medium, sliced',null,false,null,2),
  ('honey-banana-toast-pre-workout','honey','2','tsp',null,false,null,3),

  ('post-workout-chicken-sweet-potato-bowl','chicken breast','8','oz','~225 g',false,null,1),
  ('post-workout-chicken-sweet-potato-bowl','sweet potato, cubed','2','cups','~300 g',false,null,2),
  ('post-workout-chicken-sweet-potato-bowl','olive oil','1','tbsp','~15 ml',false,null,3),
  ('post-workout-chicken-sweet-potato-bowl','paprika and garlic powder','1','tsp',null,true,null,4),
  ('post-workout-chicken-sweet-potato-bowl','steamed broccoli or green beans','1','cup','~90 g',true,null,5),

  ('post-workout-berry-protein-shake','milk or water','1','cup','~240 ml',false,null,1),
  ('post-workout-berry-protein-shake','vanilla or berry protein powder','1','scoop','~30 g',false,null,2),
  ('post-workout-berry-protein-shake','frozen mixed berries','0.5','cup','~75 g',false,null,3),

  ('make-ahead-trail-mix','mixed nuts','1.5','cups','~200 g',false,null,1),
  ('make-ahead-trail-mix','dried cranberries or raisins','1','cup','~150 g',false,null,2),
  ('make-ahead-trail-mix','pretzels or whole-grain cereal','1','cup','~40 g',true,null,3),
  ('make-ahead-trail-mix','dark chocolate chips','0.33','cup','~55 g',true,null,4),

  ('cooler-bag-tournament-lunch','turkey and cheese sandwich','1','sandwich',null,false,null,1),
  ('cooler-bag-tournament-lunch','whole fruit','1','medium',null,false,null,2),
  ('cooler-bag-tournament-lunch','baby carrots or cut vegetables','0.5','cup','~60 g',true,null,3),
  ('cooler-bag-tournament-lunch','string cheese','1','piece',null,true,null,4),
  ('cooler-bag-tournament-lunch','water bottle (frozen the night before)','1','bottle',null,false,'Doubles as an ice pack.',5),

  ('tournament-pasta-salad','pasta (rotini or similar)','12','oz','~340 g',false,null,1),
  ('tournament-pasta-salad','cooked, cubed chicken breast','2','cups','~280 g',false,null,2),
  ('tournament-pasta-salad','shredded cheese','0.5','cup','~55 g',false,null,3),
  ('tournament-pasta-salad','cherry tomatoes and cucumber, chopped','1.5','cups','~200 g',true,null,4),
  ('tournament-pasta-salad','Italian dressing','0.5','cup','~120 ml',false,null,5),

  ('between-game-protein-bar-fruit-plate','protein bar (20g+ protein)','1','bar',null,false,null,1),
  ('between-game-protein-bar-fruit-plate','whole fruit','1','medium',null,false,null,2),

  ('make-ahead-protein-muffins','rolled oats','1.5','cups','~135 g',false,null,1),
  ('make-ahead-protein-muffins','vanilla protein powder','2','scoops','~60 g',false,null,2),
  ('make-ahead-protein-muffins','mashed banana','2','medium',null,false,null,3),
  ('make-ahead-protein-muffins','eggs','2','large',null,false,null,4),
  ('make-ahead-protein-muffins','baking powder','1.5','tsp',null,false,null,5),
  ('make-ahead-protein-muffins','cinnamon','1','tsp',null,true,null,6),
  ('make-ahead-protein-muffins','chocolate chips or berries','0.33','cup',null,true,null,7),

  ('apple-nachos-snack','apple, thinly sliced','1','large',null,false,null,1),
  ('apple-nachos-snack','peanut butter, warmed slightly','2','tbsp','~32 g',false,null,2),
  ('apple-nachos-snack','granola','2','tbsp',null,true,null,3),
  ('apple-nachos-snack','mini chocolate chips','1','tsp',null,true,null,4)
) as v(slug, name, quantity, unit, metric_note, optional, notes, sort_order)
join nutrition_recipes r on r.slug = v.slug;

-- ----------------------------------------------------------------------------
-- STEPS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_steps (recipe_id, body, sort_order)
select r.id, v.body, v.sort_order
from (values
  ('cottage-cheese-pineapple-recovery-bowl','Spoon the cottage cheese into a bowl.',1),
  ('cottage-cheese-pineapple-recovery-bowl','Top with pineapple chunks.',2),
  ('cottage-cheese-pineapple-recovery-bowl','Drizzle with honey if you want it sweeter.',3),

  ('recovery-rice-pudding','Combine the cooked rice and milk in a pot over medium-low heat.',1),
  ('recovery-rice-pudding','Simmer 15-18 minutes, stirring often, until thickened.',2),
  ('recovery-rice-pudding','Remove from heat and let cool 5 minutes, then stir in the protein powder, honey and cinnamon.',3),
  ('recovery-rice-pudding','Portion into containers and top with berries. Keeps refrigerated for several days.',4),

  ('tart-cherry-yogurt-recovery-parfait','Spoon a third of the yogurt into a glass or bowl.',1),
  ('tart-cherry-yogurt-recovery-parfait','Layer in half the cherries, then repeat with the remaining yogurt and cherries.',2),
  ('tart-cherry-yogurt-recovery-parfait','Top with granola and a drizzle of honey.',3),

  ('mango-protein-smoothie','Add the mango, milk and protein powder to a blender.',1),
  ('mango-protein-smoothie','Blend on high for 45-60 seconds until smooth.',2),
  ('mango-protein-smoothie','Add a squeeze of lime juice if you want it brighter.',3),

  ('pb-banana-recovery-smoothie','Add the banana, milk, peanut butter and protein powder to a blender.',1),
  ('pb-banana-recovery-smoothie','Blend on high for 45-60 seconds until smooth and thick.',2),

  ('turkey-cheese-quesadilla-pre-practice','Lay the turkey and cheese over half the tortilla, then fold it over.',1),
  ('turkey-cheese-quesadilla-pre-practice','Heat oil or butter in a pan over medium heat.',2),
  ('turkey-cheese-quesadilla-pre-practice','Cook 2-3 minutes per side until golden and the cheese is melted.',3),
  ('turkey-cheese-quesadilla-pre-practice','Let it cool slightly, then cut into strips.',4),

  ('apple-almond-butter-energy-bites','Combine the oats, almond butter, dried apple, honey and cinnamon in a bowl and mix until it holds together.',1),
  ('apple-almond-butter-energy-bites','Roll into 12 small balls.',2),
  ('apple-almond-butter-energy-bites','Refrigerate at least 30 minutes before eating. Keeps refrigerated for a week or frozen for longer.',3),

  ('post-practice-turkey-wrap','Lay the turkey and cheese on the tortilla.',1),
  ('post-practice-turkey-wrap','Add lettuce, tomato and mustard or mayo if using.',2),
  ('post-practice-turkey-wrap','Roll tightly and wrap in foil to pack ahead of time.',3),

  ('post-practice-smoothie-bowl','Add the frozen banana, milk and protein powder to a blender.',1),
  ('post-practice-smoothie-bowl','Blend on high, stopping to scrape down the sides, until thick — it should hold its shape on a spoon.',2),
  ('post-practice-smoothie-bowl','Pour into a bowl and top with granola and sliced banana or berries.',3),

  ('dates-almond-butter-energy-balls','Combine the dates, almond butter, oats and salt in a food processor.',1),
  ('dates-almond-butter-energy-balls','Process until the mixture forms a sticky ball.',2),
  ('dates-almond-butter-energy-balls','Roll into 12 small balls and refrigerate. Keeps for a week refrigerated.',3),

  ('honey-banana-toast-pre-workout','Toast the bread.',1),
  ('honey-banana-toast-pre-workout','Top with sliced banana.',2),
  ('honey-banana-toast-pre-workout','Drizzle with honey.',3),

  ('post-workout-chicken-sweet-potato-bowl','Preheat the oven to 425°F (220°C). Toss the sweet potato cubes with half the olive oil and the seasoning, then roast 20-25 minutes.',1),
  ('post-workout-chicken-sweet-potato-bowl','While the sweet potato roasts, season the chicken and cook in a pan with the remaining oil, about 6-7 minutes per side until cooked through.',2),
  ('post-workout-chicken-sweet-potato-bowl','Slice the chicken and build the bowl with sweet potato, chicken and vegetables.',3),

  ('post-workout-berry-protein-shake','Add the milk or water, protein powder and berries to a shaker bottle or blender.',1),
  ('post-workout-berry-protein-shake','Shake or blend until smooth.',2),
  ('post-workout-berry-protein-shake','Drink within 30-45 minutes of finishing training.',3),

  ('make-ahead-trail-mix','Combine the nuts, dried fruit, pretzels or cereal and chocolate chips in a large bowl.',1),
  ('make-ahead-trail-mix','Toss to mix evenly.',2),
  ('make-ahead-trail-mix','Portion into single-serving bags for the hockey bag.',3),

  ('cooler-bag-tournament-lunch','Pack the sandwich, fruit, vegetables and cheese into a container the night before.',1),
  ('cooler-bag-tournament-lunch','Add the frozen water bottle to the cooler bag to keep everything cold.',2),
  ('cooler-bag-tournament-lunch','Eat 2-3 hours before the next game.',3),

  ('tournament-pasta-salad','Cook the pasta according to package directions, then rinse under cold water to stop the cooking.',1),
  ('tournament-pasta-salad','Combine the pasta, chicken, cheese and vegetables in a large bowl.',2),
  ('tournament-pasta-salad','Toss with the dressing.',3),
  ('tournament-pasta-salad','Refrigerate overnight. Serve cold or at room temperature.',4),

  ('between-game-protein-bar-fruit-plate','Pack a protein bar and a piece of whole fruit in the hockey bag before the tournament.',1),
  ('between-game-protein-bar-fruit-plate','Eat both about 1-2 hours before the next game.',2),

  ('make-ahead-protein-muffins','Preheat the oven to 350°F (175°C) and line a muffin tin.',1),
  ('make-ahead-protein-muffins','Combine the oats, protein powder, baking powder and cinnamon in a bowl.',2),
  ('make-ahead-protein-muffins','Mix in the mashed banana and eggs until just combined, then fold in chocolate chips or berries if using.',3),
  ('make-ahead-protein-muffins','Divide into the muffin tin and bake 18-20 minutes until a toothpick comes out clean.',4),
  ('make-ahead-protein-muffins','Cool completely before storing — freeze extras for the week.',5),

  ('apple-nachos-snack','Arrange the apple slices on a plate, slightly overlapping.',1),
  ('apple-nachos-snack','Drizzle the warmed peanut butter over the top.',2),
  ('apple-nachos-snack','Sprinkle with granola and mini chocolate chips if using.',3)
) as v(slug, body, sort_order)
join nutrition_recipes r on r.slug = v.slug;

-- ----------------------------------------------------------------------------
-- TAGS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_tags (recipe_id, tag)
select r.id, v.tag
from (values
  ('cottage-cheese-pineapple-recovery-bowl','high protein'), ('cottage-cheese-pineapple-recovery-bowl','recovery'), ('cottage-cheese-pineapple-recovery-bowl','quick'), ('cottage-cheese-pineapple-recovery-bowl','no cook'),
  ('recovery-rice-pudding','recovery'), ('recovery-rice-pudding','make ahead'), ('recovery-rice-pudding','high protein'), ('recovery-rice-pudding','meal prep'),
  ('tart-cherry-yogurt-recovery-parfait','recovery'), ('tart-cherry-yogurt-recovery-parfait','high protein'), ('tart-cherry-yogurt-recovery-parfait','quick'), ('tart-cherry-yogurt-recovery-parfait','no cook'),
  ('mango-protein-smoothie','smoothie'), ('mango-protein-smoothie','pre-practice'), ('mango-protein-smoothie','quick'), ('mango-protein-smoothie','high protein'),
  ('pb-banana-recovery-smoothie','smoothie'), ('pb-banana-recovery-smoothie','recovery'), ('pb-banana-recovery-smoothie','post-workout'), ('pb-banana-recovery-smoothie','high protein'),
  ('turkey-cheese-quesadilla-pre-practice','pre-practice'), ('turkey-cheese-quesadilla-pre-practice','high protein'), ('turkey-cheese-quesadilla-pre-practice','quick'), ('turkey-cheese-quesadilla-pre-practice','kid friendly'),
  ('apple-almond-butter-energy-bites','pre-practice'), ('apple-almond-butter-energy-bites','make ahead'), ('apple-almond-butter-energy-bites','no cook'), ('apple-almond-butter-energy-bites','snack'),
  ('post-practice-turkey-wrap','post-practice'), ('post-practice-turkey-wrap','recovery'), ('post-practice-turkey-wrap','make ahead'), ('post-practice-turkey-wrap','travel'),
  ('post-practice-smoothie-bowl','post-practice'), ('post-practice-smoothie-bowl','recovery'), ('post-practice-smoothie-bowl','smoothie'), ('post-practice-smoothie-bowl','high protein'),
  ('dates-almond-butter-energy-balls','pre-workout'), ('dates-almond-butter-energy-balls','make ahead'), ('dates-almond-butter-energy-balls','no cook'), ('dates-almond-butter-energy-balls','quick'),
  ('honey-banana-toast-pre-workout','pre-workout'), ('honey-banana-toast-pre-workout','quick'), ('honey-banana-toast-pre-workout','light'), ('honey-banana-toast-pre-workout','kid friendly'),
  ('post-workout-chicken-sweet-potato-bowl','post-workout'), ('post-workout-chicken-sweet-potato-bowl','high protein'), ('post-workout-chicken-sweet-potato-bowl','recovery'), ('post-workout-chicken-sweet-potato-bowl','meal prep'),
  ('post-workout-berry-protein-shake','post-workout'), ('post-workout-berry-protein-shake','recovery'), ('post-workout-berry-protein-shake','quick'), ('post-workout-berry-protein-shake','high protein'),
  ('make-ahead-trail-mix','travel'), ('make-ahead-trail-mix','make ahead'), ('make-ahead-trail-mix','no cook'), ('make-ahead-trail-mix','road trip'),
  ('cooler-bag-tournament-lunch','travel'), ('cooler-bag-tournament-lunch','tournament'), ('cooler-bag-tournament-lunch','make ahead'), ('cooler-bag-tournament-lunch','meal prep'),
  ('tournament-pasta-salad','tournament'), ('tournament-pasta-salad','make ahead'), ('tournament-pasta-salad','high protein'), ('tournament-pasta-salad','meal prep'),
  ('between-game-protein-bar-fruit-plate','tournament'), ('between-game-protein-bar-fruit-plate','quick'), ('between-game-protein-bar-fruit-plate','no cook'), ('between-game-protein-bar-fruit-plate','travel'),
  ('make-ahead-protein-muffins','snack'), ('make-ahead-protein-muffins','make ahead'), ('make-ahead-protein-muffins','high protein'), ('make-ahead-protein-muffins','kid friendly'),
  ('apple-nachos-snack','snack'), ('apple-nachos-snack','quick'), ('apple-nachos-snack','no cook'), ('apple-nachos-snack','kid friendly')
) as v(slug, tag)
join nutrition_recipes r on r.slug = v.slug;

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select count(*) from nutrition_recipes;                         -- expect 45 (11 + 15 + 19)
--   select category, count(*) from nutrition_recipes where status='published' group by category order by category;
--   select count(*) from nutrition_recipe_ingredients;
--   select count(*) from nutrition_recipe_steps;
--   select count(*) from nutrition_recipe_tags;
--   select slug from nutrition_recipes group by slug having count(*) > 1; -- expect 0 rows (no duplicate slugs)
-- ============================================================================
