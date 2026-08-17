-- ============================================================================
-- NUTRITION COOKBOOK — RECIPE BATCH 2 (15 recipes)
--
-- Plain SQL seed, not a migration — same pattern as the original 11 recipes
-- and the Secret Sauce / guide seeds in this directory. No schema change:
-- every column used here already exists (nutrition_recipes,
-- nutrition_recipe_ingredients, nutrition_recipe_steps, nutrition_recipe_tags).
--
-- Fills categories that had zero rows before this batch: smoothies,
-- pre_practice, post_practice, pre_workout, post_workout, road, tournament.
-- Also adds one more breakfast recipe (previously only 2).
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
  ('protein-pancakes', 'Protein Pancakes',
   'Real pancakes with enough protein in them to actually hold a player over till lunch.',
   'Standard pancake batter is almost all fast carbs with barely any protein, so it burns off before first period. Blending cottage cheese and eggs into the batter adds real protein without changing the texture much, so it still tastes like a pancake.',
   'Make a double batch on Sunday and freeze extras — a toaster reheats them in two minutes on a school morning.',
   'breakfast', 'breakfast', array['3-4h_before','2-3h_before'],
   10, 15, 2, 480, 32, 52, 14, 3, 420,
   'easy', array['blender','griddle or pan'], true, true, false,
   false, false, false, false, false, false, false, false, 'published', 'premium', 110),

  ('berry-protein-smoothie', 'Berry Protein Smoothie',
   'A five-minute blend that covers a protein serving and a fruit serving in one glass.',
   'Frozen berries bring fiber and antioxidants without spiking blood sugar the way juice does, and a scoop of protein powder gets you to a real protein number without needing to chew through chicken at 7am.',
   'Keep a bag of mixed frozen berries in the freezer specifically for this — fresh berries make it too watery.',
   'smoothies', 'snack', array['1-2h_before','1-2h_after'],
   5, 0, 1, 310, 28, 38, 6, 6, 140,
   'easy', array['blender'], true, false, true,
   false, false, false, false, true, true, true, false, 'published', 'premium', 120),

  ('chocolate-banana-recovery-smoothie', 'Chocolate Banana Recovery Smoothie',
   'Tastes like a milkshake, works like a recovery shake — carbs and protein in the ratio your body actually wants after a hard skate.',
   'Banana brings fast carbs to help refill glycogen, and chocolate milk plus protein powder gets you toward the protein target research points to for post-exercise recovery. Cold and easy to drink right after you''re off the ice.',
   'Freeze banana chunks ahead of time instead of using ice — it keeps the shake thick instead of watering it down.',
   'smoothies', 'snack', array['immediately_after','1-2h_after'],
   5, 0, 1, 380, 30, 52, 7, 4, 210,
   'easy', array['blender'], true, false, false,
   false, true, false, true, false, true, true, false, 'published', 'premium', 130),

  ('turkey-rice-pre-practice-bowl', 'Turkey & Rice Pre-Practice Bowl',
   'A simple, low-fat bowl timed to be digested and out of the way before puck drop at practice.',
   'Ground turkey is lean, so it won''t sit heavy the way a greasy meal does, and white rice digests fast enough to be mostly used up by the time practice starts 2-3 hours later.',
   'Make a big batch of turkey and rice on Sunday — it reheats fine and covers three or four pre-practice meals.',
   'pre_practice', 'lunch', array['2-3h_before','3-4h_before'],
   10, 20, 2, 520, 40, 58, 12, 3, 460,
   'easy', array['pan','pot or rice cooker'], false, true, false,
   false, false, true, false, false, false, false, false, 'published', 'premium', 140),

  ('oatmeal-banana-protein-bowl', 'Oatmeal, Banana & Protein Bowl',
   'A five-minute bowl that fuels a practice without sitting like a brick.',
   'Oats are a slow-digesting carb that release energy steadily rather than spiking and crashing, and stirring in protein powder closes the gap oatmeal alone leaves in a pre-practice meal.',
   'If practice is early, this is easier to get down than a full plate of eggs — make it the night before as overnight oats if mornings are tight.',
   'pre_practice', 'breakfast', array['1-2h_before','2-3h_before'],
   5, 5, 1, 420, 26, 60, 9, 7, 180,
   'easy', array['pot or microwave-safe bowl'], true, false, false,
   false, false, true, false, false, false, false, false, 'published', 'premium', 150),

  ('post-practice-chocolate-milk-recovery', 'Post-Practice Chocolate Milk Recovery Shake',
   'The fastest recovery option there is — grab it, drink it, done.',
   'Chocolate milk happens to land close to the carb-to-protein ratio commonly recommended for recovery, it''s cold and easy to drink when you don''t feel like eating, and it''s one of the most studied recovery drinks in youth sports.',
   'Keep a couple of cartons of chocolate milk in a cooler in the car — recovery starts the second you''re off the ice instead of 45 minutes later at home.',
   'post_practice', 'snack', array['immediately_after'],
   2, 0, 1, 260, 14, 40, 5, 1, 220,
   'easy', array[]::text[], true, false, false,
   false, true, false, true, false, false, true, false, 'published', 'premium', 160),

  ('greek-yogurt-fruit-cereal-recovery-bowl', 'Greek Yogurt, Fruit & Cereal Recovery Bowl',
   'A crunchy, cold bowl that covers protein and carbs without needing a stove.',
   'Greek yogurt is a dense, fast source of protein, the fruit replaces some of the sugar and fluid lost sweating, and a bit of cereal adds crunch and quick carbs without turning it into dessert.',
   'Use plain Greek yogurt and let the honey and fruit do the sweetening — flavored yogurts often have more added sugar than the cereal does.',
   'post_practice', 'snack', array['1-2h_after','immediately_after'],
   5, 0, 1, 340, 24, 48, 6, 4, 150,
   'easy', array[]::text[], true, false, false,
   false, false, false, true, false, false, true, false, 'published', 'premium', 170),

  ('banana-peanut-butter-toast', 'Banana & Peanut Butter Toast',
   'The classic pre-workout combo for a reason — quick carbs and a bit of fat and protein that won''t slow you down.',
   'Toast gives fast-digesting carbs for near-term energy, banana adds potassium and more quick carbs, and a moderate amount of peanut butter adds just enough protein and fat to hold you over without sitting heavy through a lift.',
   'Eat this 45-60 minutes before lifting, not right before — give it a little time to start digesting.',
   'pre_workout', 'snack', array['30-60m_before','1-2h_before'],
   5, 3, 1, 340, 11, 44, 14, 5, 260,
   'easy', array['toaster'], true, false, true,
   false, false, false, false, true, false, false, false, 'published', 'premium', 180),

  ('rice-cakes-peanut-butter-honey', 'Rice Cakes with Peanut Butter & Honey',
   'A light, low-fiber option for players whose stomachs don''t handle a full meal before training.',
   'Rice cakes are almost pure fast carbs with very little fiber or fat, which means they clear the stomach quickly — useful if a heavier pre-workout snack has ever left you feeling sluggish or bloated during a lift.',
   'If you''re sensitive to eating close to training, this is the safer choice over the banana-toast option — less fiber means less chance of stomach trouble mid-set.',
   'pre_workout', 'snack', array['30-60m_before'],
   3, 0, 1, 220, 5, 38, 6, 2, 140,
   'easy', array[]::text[], true, false, true,
   false, false, false, false, true, false, false, false, 'published', 'premium', 190),

  ('steak-rice-power-bowl', 'Steak & Rice Power Bowl',
   'A heartier recovery bowl for after a strength session, built around a bigger protein hit than a shake alone provides.',
   'Steak brings a dense dose of protein plus iron and zinc, which matter for an athlete training hard, and the rice restocks glycogen burned during a lifting session. Meant as a sit-down meal, not a grab-and-go.',
   'Let the steak rest 5 minutes after cooking before you cut it — it keeps the juices in instead of on the cutting board.',
   'post_workout', 'dinner', array['1-2h_after'],
   10, 15, 1, 610, 46, 55, 18, 3, 420,
   'moderate', array['pan or grill'], false, false, false,
   false, false, false, false, false, true, true, false, 'published', 'premium', 200),

  ('protein-pasta-bowl', 'Protein Pasta Bowl',
   'A carb-forward bowl for a big training day, with enough protein mixed in that it''s a real recovery meal, not just a plate of noodles.',
   'A hard training day burns through glycogen fast, and pasta is one of the most efficient ways to replace it. Ground turkey or chicken closes the gap so the meal isn''t carbs alone.',
   'If you can find protein or chickpea pasta at the store, it''s an easy swap that adds more protein without changing how the dish tastes.',
   'post_workout', 'dinner', array['1-2h_after','immediately_after'],
   10, 20, 2, 560, 38, 66, 14, 5, 480,
   'easy', array['pot','pan'], false, true, false,
   false, false, false, false, false, true, true, false, 'published', 'premium', 210),

  ('gas-station-survival-plate', 'Gas Station Survival Plate',
   'The realistic version of eating well when the only stop between rinks is a gas station.',
   'It''s not a perfect meal, but it beats candy and a fountain drink — this combination gets real protein, some fluid, and carbs that aren''t pure sugar, all from things sold at basically every gas station in the country.',
   'String cheese and beef jerky travel well and don''t need refrigeration for a couple of hours — keep a stash in the hockey bag so you''re never stuck relying only on what the station has.',
   'road', 'snack', array['1-2h_before','2-3h_before'],
   3, 0, 1, 380, 26, 42, 12, 3, 780,
   'easy', array[]::text[], true, false, true,
   false, false, false, false, false, false, false, false, 'published', 'premium', 220),

  ('hotel-room-protein-breakfast', 'Hotel Room Protein Breakfast',
   'Built entirely around what you can pack in a cooler bag or buy at a hotel breakfast bar — no kitchen required.',
   'Hotel continental breakfasts are usually heavy on refined carbs and light on protein. Packing your own protein source and pairing it with what''s available at the breakfast bar fixes that gap without needing to cook anything.',
   'Individual Greek yogurt cups and hard-boiled eggs travel well in a small cooler with an ice pack and survive a full tournament weekend.',
   'road', 'breakfast', array['2-3h_before','3-4h_before'],
   5, 0, 1, 400, 28, 48, 11, 4, 310,
   'easy', array['small cooler'], true, false, true,
   false, false, false, false, false, false, false, true, 'published', 'premium', 230),

  ('between-games-fuel-box', 'Between-Games Tournament Fuel Box',
   'A pack-ahead box built for the two- or three-hour gap between tournament games, when a sit-down meal isn''t realistic.',
   'Between games you want something that digests fast enough to be ready for the next puck drop, without the heavy, greasy food often sold at rinks. This box covers carbs, protein and fluid in portions easy to eat in a rink lobby or the car.',
   'Pack one box per game gap the night before the tournament — it removes the decision-making when everyone is tired and the rink concession is the easy default.',
   'tournament', 'snack', array['1-2h_before','2-3h_before'],
   10, 0, 1, 420, 22, 58, 10, 5, 380,
   'easy', array['container with lid'], true, true, true,
   false, false, false, false, false, false, false, true, 'published', 'premium', 240),

  ('tournament-morning-power-bowl', 'Tournament Morning Power Bowl',
   'A bigger breakfast for an early tournament morning, built to hold a player through warm-ups and the first period without a mid-game crash.',
   'An early tournament game often means eating 3-4 hours before puck drop, which is enough time for a fuller meal to digest. This combines slow-digesting carbs, a real protein portion and some fat for steady energy across a longer morning.',
   'If the game is earlier than 3 hours after this meal, cut the portion in half and add a banana closer to warm-up instead.',
   'tournament', 'breakfast', array['3-4h_before'],
   10, 12, 1, 560, 34, 62, 18, 6, 480,
   'easy', array['pan','pot'], true, false, false,
   true, false, false, false, false, false, false, true, 'published', 'premium', 250);

-- ----------------------------------------------------------------------------
-- INGREDIENTS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_ingredients (recipe_id, name, quantity, unit, metric_note, optional, notes, sort_order)
select r.id, v.name, v.quantity::numeric, v.unit, v.metric_note, v.optional, v.notes, v.sort_order
from (values
  ('protein-pancakes','rolled oats','1','cup','~90 g',false,null,1),
  ('protein-pancakes','cottage cheese','1','cup','~225 g',false,null,2),
  ('protein-pancakes','eggs','2','large',null,false,null,3),
  ('protein-pancakes','banana','1','medium',null,false,null,4),
  ('protein-pancakes','baking powder','1','tsp',null,false,null,5),
  ('protein-pancakes','cinnamon','0.5','tsp',null,true,null,6),
  ('protein-pancakes','maple syrup','1','drizzle',null,true,'Or to taste, for serving.',7),

  ('berry-protein-smoothie','frozen mixed berries','1','cup','~150 g',false,null,1),
  ('berry-protein-smoothie','milk or milk alternative','1','cup','~240 ml',false,null,2),
  ('berry-protein-smoothie','vanilla protein powder','1','scoop','~30 g',false,null,3),
  ('berry-protein-smoothie','Greek yogurt','0.5','cup','~120 g',true,'Adds extra protein and thickness.',4),
  ('berry-protein-smoothie','honey','1','tsp',null,true,null,5),

  ('chocolate-banana-recovery-smoothie','frozen banana','1','large','~120 g',false,null,1),
  ('chocolate-banana-recovery-smoothie','chocolate milk','1','cup','~240 ml',false,null,2),
  ('chocolate-banana-recovery-smoothie','chocolate or vanilla protein powder','1','scoop','~30 g',false,null,3),
  ('chocolate-banana-recovery-smoothie','cocoa powder','1','tsp',null,true,null,4),
  ('chocolate-banana-recovery-smoothie','peanut butter','1','tbsp',null,true,'Adds healthy fat and makes it more filling.',5),

  ('turkey-rice-pre-practice-bowl','ground turkey (93/7)','1','lb','~450 g',false,null,1),
  ('turkey-rice-pre-practice-bowl','cooked white rice','2','cups','~370 g',false,null,2),
  ('turkey-rice-pre-practice-bowl','soy sauce','2','tbsp','~30 ml',false,null,3),
  ('turkey-rice-pre-practice-bowl','garlic','2','cloves, minced',null,true,null,4),
  ('turkey-rice-pre-practice-bowl','frozen peas and carrots','1','cup','~150 g',false,null,5),
  ('turkey-rice-pre-practice-bowl','olive oil','1','tbsp','~15 ml',false,null,6),

  ('oatmeal-banana-protein-bowl','rolled oats','0.5','cup','~45 g',false,null,1),
  ('oatmeal-banana-protein-bowl','water or milk','1','cup','~240 ml',false,null,2),
  ('oatmeal-banana-protein-bowl','vanilla protein powder','1','scoop','~30 g',false,null,3),
  ('oatmeal-banana-protein-bowl','banana','1','medium, sliced',null,false,null,4),
  ('oatmeal-banana-protein-bowl','peanut butter','1','tbsp',null,true,null,5),
  ('oatmeal-banana-protein-bowl','cinnamon','0.25','tsp',null,true,null,6),

  ('post-practice-chocolate-milk-recovery','low-fat chocolate milk','16','oz','~475 ml',false,null,1),
  ('post-practice-chocolate-milk-recovery','protein powder','1','scoop','~30 g',true,'Optional boost if you want more protein than the milk alone provides.',2),

  ('greek-yogurt-fruit-cereal-recovery-bowl','plain Greek yogurt','1','cup','~225 g',false,null,1),
  ('greek-yogurt-fruit-cereal-recovery-bowl','mixed berries or sliced banana','0.5','cup','~75 g',false,null,2),
  ('greek-yogurt-fruit-cereal-recovery-bowl','low-sugar granola or cereal','0.33','cup','~30 g',false,null,3),
  ('greek-yogurt-fruit-cereal-recovery-bowl','honey','1','tsp',null,true,null,4),

  ('banana-peanut-butter-toast','whole wheat bread','2','slices',null,false,null,1),
  ('banana-peanut-butter-toast','peanut butter','2','tbsp','~32 g',false,null,2),
  ('banana-peanut-butter-toast','banana','1','medium, sliced',null,false,null,3),
  ('banana-peanut-butter-toast','honey','1','tsp',null,true,null,4),
  ('banana-peanut-butter-toast','cinnamon','0.25','tsp',null,true,null,5),

  ('rice-cakes-peanut-butter-honey','rice cakes','2','cakes',null,false,null,1),
  ('rice-cakes-peanut-butter-honey','peanut butter','1.5','tbsp','~24 g',false,null,2),
  ('rice-cakes-peanut-butter-honey','honey','1','tsp',null,false,null,3),

  ('steak-rice-power-bowl','sirloin or flank steak','6','oz','~170 g',false,null,1),
  ('steak-rice-power-bowl','cooked white rice','1.5','cups','~280 g',false,null,2),
  ('steak-rice-power-bowl','broccoli or mixed vegetables','1','cup','~90 g',false,null,3),
  ('steak-rice-power-bowl','olive oil','1','tbsp','~15 ml',false,null,4),
  ('steak-rice-power-bowl','garlic powder','0.5','tsp',null,true,null,5),
  ('steak-rice-power-bowl','salt and pepper','1','pinch',null,true,null,6),

  ('protein-pasta-bowl','pasta (regular or protein/chickpea)','8','oz','~225 g',false,null,1),
  ('protein-pasta-bowl','ground turkey or chicken','8','oz','~225 g',false,null,2),
  ('protein-pasta-bowl','marinara sauce','1.5','cups','~360 ml',false,null,3),
  ('protein-pasta-bowl','parmesan cheese','0.25','cup','~25 g',true,null,4),
  ('protein-pasta-bowl','olive oil','1','tbsp','~15 ml',false,null,5),
  ('protein-pasta-bowl','Italian seasoning','1','tsp',null,true,null,6),

  ('gas-station-survival-plate','beef jerky or turkey jerky','1','oz','~28 g',false,null,1),
  ('gas-station-survival-plate','string cheese','2','pieces',null,false,null,2),
  ('gas-station-survival-plate','banana or apple','1','medium',null,false,null,3),
  ('gas-station-survival-plate','trail mix or nuts','1','small bag','~40 g',true,null,4),
  ('gas-station-survival-plate','water or sports drink','16','oz','~475 ml',false,null,5),

  ('hotel-room-protein-breakfast','Greek yogurt cup','1','cup','~170 g',false,null,1),
  ('hotel-room-protein-breakfast','hard-boiled eggs (packed from home)','2','large',null,false,null,2),
  ('hotel-room-protein-breakfast','whole fruit','1','medium',null,false,null,3),
  ('hotel-room-protein-breakfast','hotel breakfast bar oatmeal or toast','1','serving',null,true,null,4),

  ('between-games-fuel-box','turkey and cheese roll-ups','3','pieces',null,false,null,1),
  ('between-games-fuel-box','whole grain crackers','8','crackers','~30 g',false,null,2),
  ('between-games-fuel-box','grapes or cut apple','1','cup','~75 g',false,null,3),
  ('between-games-fuel-box','string cheese','1','piece',null,true,null,4),
  ('between-games-fuel-box','water bottle','1','bottle',null,false,null,5),

  ('tournament-morning-power-bowl','eggs','3','large',null,false,null,1),
  ('tournament-morning-power-bowl','rolled oats','0.5','cup','~45 g',false,null,2),
  ('tournament-morning-power-bowl','mixed berries','0.5','cup','~75 g',false,null,3),
  ('tournament-morning-power-bowl','whole wheat toast','1','slice',null,true,null,4),
  ('tournament-morning-power-bowl','avocado','0.25','medium',null,true,null,5)
) as v(slug, name, quantity, unit, metric_note, optional, notes, sort_order)
join nutrition_recipes r on r.slug = v.slug;

-- ----------------------------------------------------------------------------
-- STEPS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_steps (recipe_id, body, sort_order)
select r.id, v.body, v.sort_order
from (values
  ('protein-pancakes','Add the oats, cottage cheese, eggs, banana, baking powder and cinnamon to a blender.',1),
  ('protein-pancakes','Blend until smooth, about 30 seconds. The batter will be thicker than regular pancake batter — that''s normal.',2),
  ('protein-pancakes','Heat a griddle or non-stick pan over medium heat and lightly grease it.',3),
  ('protein-pancakes','Pour 1/4-cup portions onto the griddle. Cook 2-3 minutes until bubbles form on top, then flip and cook 1-2 minutes more.',4),
  ('protein-pancakes','Serve with maple syrup or fruit.',5),

  ('berry-protein-smoothie','Add the berries, milk and protein powder to a blender.',1),
  ('berry-protein-smoothie','Add the Greek yogurt if using.',2),
  ('berry-protein-smoothie','Blend on high for 45-60 seconds until smooth.',3),
  ('berry-protein-smoothie','Taste and add honey if you want it sweeter.',4),

  ('chocolate-banana-recovery-smoothie','Add the frozen banana, chocolate milk and protein powder to a blender.',1),
  ('chocolate-banana-recovery-smoothie','Add cocoa powder and peanut butter if using.',2),
  ('chocolate-banana-recovery-smoothie','Blend on high for 45-60 seconds until smooth and thick.',3),
  ('chocolate-banana-recovery-smoothie','Drink within 30-45 minutes of stepping off the ice for the best effect.',4),

  ('turkey-rice-pre-practice-bowl','Heat the olive oil in a pan over medium-high heat.',1),
  ('turkey-rice-pre-practice-bowl','Add the ground turkey and garlic, breaking the turkey apart as it cooks, about 6-8 minutes until no longer pink.',2),
  ('turkey-rice-pre-practice-bowl','Add the peas and carrots and cook 3-4 more minutes.',3),
  ('turkey-rice-pre-practice-bowl','Stir in the soy sauce and cooked rice, tossing until warmed through.',4),
  ('turkey-rice-pre-practice-bowl','Divide into bowls or containers for the week.',5),

  ('oatmeal-banana-protein-bowl','Combine the oats and water or milk in a pot or microwave-safe bowl.',1),
  ('oatmeal-banana-protein-bowl','Cook on the stove for 3-4 minutes, or microwave for 90 seconds, stirring halfway.',2),
  ('oatmeal-banana-protein-bowl','Let it cool for a minute, then stir in the protein powder until smooth.',3),
  ('oatmeal-banana-protein-bowl','Top with sliced banana, peanut butter and cinnamon.',4),

  ('post-practice-chocolate-milk-recovery','Pour the chocolate milk into a shaker bottle.',1),
  ('post-practice-chocolate-milk-recovery','Add protein powder if using and shake until dissolved.',2),
  ('post-practice-chocolate-milk-recovery','Drink within 30 minutes of finishing practice.',3),

  ('greek-yogurt-fruit-cereal-recovery-bowl','Spoon the Greek yogurt into a bowl.',1),
  ('greek-yogurt-fruit-cereal-recovery-bowl','Top with the fruit and granola or cereal.',2),
  ('greek-yogurt-fruit-cereal-recovery-bowl','Drizzle with honey if you want it sweeter.',3),

  ('banana-peanut-butter-toast','Toast the bread.',1),
  ('banana-peanut-butter-toast','Spread peanut butter evenly over each slice.',2),
  ('banana-peanut-butter-toast','Top with sliced banana.',3),
  ('banana-peanut-butter-toast','Drizzle with honey and a dusting of cinnamon if using.',4),

  ('rice-cakes-peanut-butter-honey','Spread peanut butter evenly over each rice cake.',1),
  ('rice-cakes-peanut-butter-honey','Drizzle with honey.',2),
  ('rice-cakes-peanut-butter-honey','Eat about 30-45 minutes before training.',3),

  ('steak-rice-power-bowl','Season the steak with salt, pepper and garlic powder if using.',1),
  ('steak-rice-power-bowl','Heat olive oil in a pan over high heat. Sear the steak 3-4 minutes per side for medium, adjusting for thickness.',2),
  ('steak-rice-power-bowl','Let the steak rest 5 minutes, then slice against the grain.',3),
  ('steak-rice-power-bowl','Steam or microwave the vegetables while the steak rests.',4),
  ('steak-rice-power-bowl','Build the bowl with rice on the bottom, steak and vegetables on top.',5),

  ('protein-pasta-bowl','Cook the pasta according to package directions. Drain and set aside.',1),
  ('protein-pasta-bowl','Heat olive oil in a pan over medium-high heat. Cook the ground turkey or chicken 6-8 minutes, breaking it apart, until no longer pink.',2),
  ('protein-pasta-bowl','Add the marinara sauce and Italian seasoning, and simmer 5 minutes.',3),
  ('protein-pasta-bowl','Toss the cooked pasta into the sauce.',4),
  ('protein-pasta-bowl','Top with parmesan cheese if using.',5),

  ('gas-station-survival-plate','Pick a protein — jerky and string cheese are the most reliable gas-station options.',1),
  ('gas-station-survival-plate','Pair it with a piece of whole fruit if the station has one, or trail mix if not.',2),
  ('gas-station-survival-plate','Drink water or a sports drink alongside it, not soda.',3),
  ('gas-station-survival-plate','Save any candy or chips for after, not instead of, this.',4),

  ('hotel-room-protein-breakfast','Pack Greek yogurt cups and pre-cooked hard-boiled eggs in a small cooler before you leave home.',1),
  ('hotel-room-protein-breakfast','At the hotel, pair your packed protein with fruit and oatmeal or toast from the breakfast bar.',2),
  ('hotel-room-protein-breakfast','Skip the waffle station as the main event — treat it as a side, not the meal.',3),

  ('between-games-fuel-box','Roll turkey slices around a piece of cheese to make roll-ups.',1),
  ('between-games-fuel-box','Pack the roll-ups, crackers, fruit and string cheese together in a container the night before.',2),
  ('between-games-fuel-box','Eat 1-2 hours before the next game, with water alongside it.',3),

  ('tournament-morning-power-bowl','Cook the oats with water or milk according to package directions.',1),
  ('tournament-morning-power-bowl','Meanwhile, scramble or fry the eggs in a lightly greased pan.',2),
  ('tournament-morning-power-bowl','Top the oats with berries.',3),
  ('tournament-morning-power-bowl','Serve the eggs alongside, with toast and avocado if using.',4)
) as v(slug, body, sort_order)
join nutrition_recipes r on r.slug = v.slug;

-- ----------------------------------------------------------------------------
-- TAGS
-- ----------------------------------------------------------------------------
insert into nutrition_recipe_tags (recipe_id, tag)
select r.id, v.tag
from (values
  ('protein-pancakes','high protein'), ('protein-pancakes','breakfast'), ('protein-pancakes','make ahead'), ('protein-pancakes','kid friendly'),
  ('berry-protein-smoothie','high protein'), ('berry-protein-smoothie','smoothie'), ('berry-protein-smoothie','quick'), ('berry-protein-smoothie','recovery'),
  ('chocolate-banana-recovery-smoothie','high protein'), ('chocolate-banana-recovery-smoothie','smoothie'), ('chocolate-banana-recovery-smoothie','recovery'), ('chocolate-banana-recovery-smoothie','post-game'),
  ('turkey-rice-pre-practice-bowl','high protein'), ('turkey-rice-pre-practice-bowl','meal prep'), ('turkey-rice-pre-practice-bowl','pre-practice'), ('turkey-rice-pre-practice-bowl','make ahead'),
  ('oatmeal-banana-protein-bowl','high protein'), ('oatmeal-banana-protein-bowl','pre-practice'), ('oatmeal-banana-protein-bowl','quick'), ('oatmeal-banana-protein-bowl','breakfast'),
  ('post-practice-chocolate-milk-recovery','recovery'), ('post-practice-chocolate-milk-recovery','post-practice'), ('post-practice-chocolate-milk-recovery','quick'), ('post-practice-chocolate-milk-recovery','no cook'),
  ('greek-yogurt-fruit-cereal-recovery-bowl','high protein'), ('greek-yogurt-fruit-cereal-recovery-bowl','recovery'), ('greek-yogurt-fruit-cereal-recovery-bowl','post-practice'), ('greek-yogurt-fruit-cereal-recovery-bowl','no cook'),
  ('banana-peanut-butter-toast','pre-workout'), ('banana-peanut-butter-toast','quick'), ('banana-peanut-butter-toast','no cook'), ('banana-peanut-butter-toast','kid friendly'),
  ('rice-cakes-peanut-butter-honey','pre-workout'), ('rice-cakes-peanut-butter-honey','quick'), ('rice-cakes-peanut-butter-honey','no cook'), ('rice-cakes-peanut-butter-honey','light'),
  ('steak-rice-power-bowl','high protein'), ('steak-rice-power-bowl','post-workout'), ('steak-rice-power-bowl','recovery'), ('steak-rice-power-bowl','dinner'),
  ('protein-pasta-bowl','high protein'), ('protein-pasta-bowl','post-workout'), ('protein-pasta-bowl','meal prep'), ('protein-pasta-bowl','dinner'),
  ('gas-station-survival-plate','travel'), ('gas-station-survival-plate','quick'), ('gas-station-survival-plate','no cook'), ('gas-station-survival-plate','road trip'),
  ('hotel-room-protein-breakfast','travel'), ('hotel-room-protein-breakfast','tournament'), ('hotel-room-protein-breakfast','no cook'), ('hotel-room-protein-breakfast','breakfast'),
  ('between-games-fuel-box','tournament'), ('between-games-fuel-box','travel'), ('between-games-fuel-box','make ahead'), ('between-games-fuel-box','no cook'),
  ('tournament-morning-power-bowl','tournament'), ('tournament-morning-power-bowl','pre-game'), ('tournament-morning-power-bowl','breakfast'), ('tournament-morning-power-bowl','high protein')
) as v(slug, tag)
join nutrition_recipes r on r.slug = v.slug;

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select count(*) from nutrition_recipes;                         -- expect 26 (11 + 15)
--   select category, count(*) from nutrition_recipes group by category order by category;
--   select count(*) from nutrition_recipe_ingredients;
--   select count(*) from nutrition_recipe_steps;
--   select count(*) from nutrition_recipe_tags;
--   select slug from nutrition_recipes group by slug having count(*) > 1; -- expect 0 rows (no duplicate slugs)
-- ============================================================================
