-- ---------------------------------------------------------------------------
-- SECRET SAUCE — SEED (batch 1)
--
-- NOT A MIGRATION. This is content, applied separately so migration state
-- stays exactly as reconciled. Re-runnable: every insert is ON CONFLICT
-- DO NOTHING against the unique slug.
--
-- CITATION POLICY — READ BEFORE EDITING
-- Sources are recorded as ORGANIZATION + DOCUMENT TITLE + YEAR only. The url
-- and doi columns are deliberately left NULL. Nothing in this file was
-- generated from memory of a specific paper's identifier, because an
-- unverified DOI that looks authoritative is worse than no DOI at all. Fill
-- them in through the admin UI once you have personally checked each link.
--
-- SAFETY POSTURE
-- The audience includes teenagers. Every entry that touches a supplement
-- carries who_should_avoid and side_effects, and none is framed as required.
-- Sodium bicarbonate and caffeine are written most conservatively of all.
-- ---------------------------------------------------------------------------

-- 1 ---------------------------------------------------------------- CREATINE
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'creatine-monohydrate','Creatine Monohydrate','supplements',
 'A compound your body already makes and stores in muscle, also found in meat and fish. Creatine monohydrate is the most studied form by a wide margin.',
 'Muscle uses stored phosphocreatine to regenerate energy during short, maximal efforts. Supplementing raises those stores, which may support repeated high-intensity work — shifts, sprints, and heavy sets — and training adaptations over time.',
 'It works by saturating muscle stores over days to weeks, so it is a training-block supplement, not something you take on game day for an effect that night.',
 'Taken daily with fluid. Timing within the day appears to matter far less than simply taking it consistently. Choose a third-party tested product — NSF Certified for Sport or Informed Sport.',
 'Research commonly uses about 3–5 g per day of creatine monohydrate taken consistently. Some protocols use a higher loading phase for the first week; it is not required, it only saturates stores faster.',
 'Anyone under 18 should not start without talking to a parent or guardian and a physician or sports dietitian. Anyone with kidney disease, or taking medication affecting the kidneys, should speak to their doctor first. Athletes under anti-doping testing should use only third-party tested products.',
 'Some people gain a small amount of weight early on, largely water held inside muscle. Occasional stomach upset, usually reduced by splitting the dose and taking it with food and fluid. The claim that creatine causes dehydration or cramping has not been supported by the research.',
 'A player runs a 12-week off-season strength block and takes creatine daily throughout, alongside a diet that already hits protein and calorie targets. It supports the training — it does not replace it.',
 'strong','published','premium',10
) on conflict (slug) do nothing;

-- 2 -------------------------------------------------------- CHOCOLATE MILK
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'chocolate-milk-recovery','Chocolate Milk for Recovery','recovery',
 'Ordinary low-fat chocolate milk used as a post-exercise recovery drink.',
 'It happens to combine carbohydrate, protein, fluid and some sodium in roughly the proportions recovery calls for. The advantage is practical rather than magical: it is cheap, available everywhere, needs no preparation, and players will actually drink it when they will not eat a meal.',
 'Within roughly 30–60 minutes of a demanding game, practice or lift — especially when the next session is soon and a proper meal is not available yet.',
 'Drink it, then eat a real meal within about two hours. Treat it as a bridge, not a substitute for dinner.',
 'Commonly around 300–500 ml (roughly 16 oz) after training. Scale to body size and how hard the session was.',
 'Anyone with a milk allergy. Those with lactose intolerance may prefer lactose-free milk or a different recovery option. It is a sugary drink, so it belongs around training rather than as an all-day beverage.',
 'Generally well tolerated. Some players find dairy sits heavily immediately after very hard efforts — if that is you, wait twenty minutes or use a different option.',
 'Bus leaves fifteen minutes after a Sunday tournament game with another game in four hours. Chocolate milk and a banana on the bus, real meal at the next stop.',
 'moderate','published','premium',20
) on conflict (slug) do nothing;

-- 3 --------------------------------------------------------- PROTEIN TIMING
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'protein-timing-distribution','Protein Timing & Distribution','nutrition',
 'Spreading protein across the day in similar-sized amounts rather than eating most of it at dinner.',
 'Muscle protein synthesis responds to a meaningful dose of protein at a time. Most young athletes eat very little at breakfast and a large amount at dinner, which leaves much of the day without the stimulus. Evening out the distribution is a low-effort change with a plausible benefit.',
 'Every day. This is a habit, not an event — it matters more on heavy training days but is not something you switch on and off.',
 'Aim for a solid protein source at each meal: eggs or Greek yogurt at breakfast, meat or fish at lunch and dinner, a protein-containing snack between. The old idea of a narrow thirty-minute anabolic window after training has been substantially overstated — total daily intake and reasonable spacing matter more than racing a clock.',
 'Sports nutrition guidance for athletes commonly falls in the range of roughly 1.2–2.0 g of protein per kg of body weight per day, spread across meals. Individual needs vary with training load, age and goals.',
 'Athletes with kidney disease should follow their physician''s guidance on protein intake rather than general sports nutrition targets.',
 'None expected from food sources at normal intakes. Very high intakes tend to displace carbohydrate, which can leave you underfuelled for skating.',
 'A player who ate 10 g of protein at breakfast and 60 g at dinner moves to roughly 30 g at each of three meals — same daily total, better spread, no extra cost.',
 'moderate','published','premium',30
) on conflict (slug) do nothing;

-- 4 ------------------------------------------------------ CARBOHYDRATE LOAD
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'carbohydrate-loading','Carbohydrate Loading & Glycogen','fuelling',
 'Deliberately raising carbohydrate intake in the day or two before heavy competition to maximise muscle glycogen.',
 'Muscle glycogen is the primary fuel for repeated high-intensity efforts. Starting a tournament or a heavy game weekend with fuller stores means you have more available late in the third period and in the second game of a day.',
 'The day before a tournament or a demanding game weekend. Also useful between games on the same day, in smaller amounts.',
 'Increase the carbohydrate portion of normal meals — more rice, pasta, potato, bread, fruit — rather than adding entirely new foods. Keep fat and fibre moderate so digestion stays comfortable. Do not experiment with unfamiliar food the night before competition.',
 'Sports nutrition guidance for athletes in heavy training commonly cites carbohydrate intakes in the range of roughly 6–10 g per kg of body weight per day, with higher ends used around competition. Individual needs vary considerably.',
 'Athletes with diabetes should manage carbohydrate intake with their healthcare team. Anyone with a history of disordered eating should approach deliberate intake targets with professional support.',
 'Some players feel heavy or bloated if they overdo it, particularly with high-fibre carbohydrate sources. This is a reason to practise it before a tournament rather than trying it for the first time.',
 'Saturday tournament with three games. Friday dinner is pasta with lean protein and a lighter salad rather than a heavy, fatty meal.',
 'strong','published','premium',40
) on conflict (slug) do nothing;

-- 5 ---------------------------------------------------------------- CAFFEINE
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'caffeine','Caffeine','supplements',
 'A stimulant found in coffee, tea, and many energy and sports products.',
 'Caffeine acts on the central nervous system and can reduce perceived effort, which may support performance in a range of sports. The effect is real but individual response varies widely, and more is not better.',
 'This is one to be careful with, and for young players it is one to be careful with twice. Evening hockey is extremely common, and caffeine taken before a night game can cost you hours of the sleep that actually drives recovery.',
 'If it is used at all, it should be trialled in training, never for the first time before a game that matters. Keep it well away from bedtime.',
 'Research in adult athletes commonly examines doses in the range of about 3–6 mg per kg of body weight taken roughly an hour before exercise. These figures are not a recommendation for adolescent athletes.',
 'Adolescent athletes should not use caffeine supplements without involving a parent or guardian and a qualified health professional. Anyone with a heart condition, high blood pressure, anxiety disorder, or sleep problems should avoid it or seek medical advice. Energy drinks in particular often combine high caffeine with other stimulants and are not appropriate for youth athletes.',
 'Jitteriness, elevated heart rate, anxiety, stomach upset, and disrupted sleep. Regular use builds tolerance. Sleep disruption after evening games is the most common and most costly problem in hockey specifically.',
 'A 19-year-old junior player who already drinks coffee trials a small amount before a morning practice to see how it sits, and does not touch it before evening games because it wrecks his sleep.',
 'strong','published','premium',50
) on conflict (slug) do nothing;

-- 6 ------------------------------------------------------- BEETROOT/NITRATE
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'beetroot-nitrate','Beetroot Juice & Dietary Nitrate','supplements',
 'Beetroot and other nitrate-rich vegetables, often taken as concentrated juice.',
 'Dietary nitrate is converted in the body toward nitric oxide, which is involved in blood flow and muscle efficiency. Research has explored effects on endurance performance, with more consistent findings in endurance contexts than in intermittent, high-intensity team sports like hockey.',
 'If trialled at all, in the hours before competition, and only after testing it in training.',
 'Typically taken as concentrated beetroot juice a few hours before exercise. Note that antibacterial mouthwash can interfere with the pathway that converts nitrate in the mouth.',
 'Research protocols commonly use concentrated beetroot juice shots providing a standardised nitrate dose, taken roughly 2–3 hours before exercise. Products vary considerably in concentration — read the label.',
 'Anyone taking blood pressure medication or nitrate medication should speak to a physician first, as effects may compound. Younger athletes should involve a parent or guardian and a health professional.',
 'Harmless red colouring of urine and stool, which surprises people who were not expecting it. Some stomach upset. Evidence for benefit in hockey-type intermittent sport is less consistent than in endurance sport.',
 'A player curious about it tries it before two practices, notices nothing either way, and decides the money is better spent on food and sleep. That is a completely reasonable outcome.',
 'moderate','published','premium',60
) on conflict (slug) do nothing;

-- 7 ------------------------------------------------------ ELECTROLYTE / NA
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'sodium-electrolytes','Sodium & Electrolytes','hydration',
 'Replacing sodium and other electrolytes lost in sweat, rather than replacing fluid with plain water alone.',
 'Sweat contains sodium, and losses vary enormously between individuals. Sodium helps the body retain the fluid you drink rather than passing it straight through. In full hockey equipment, in a warm rink, across a tournament weekend, those losses add up.',
 'Long or hot sessions, tournament weekends, back-to-back games, and for players who visibly sweat heavily or finish with salt marks on their gear or skin.',
 'Use a sports drink or an electrolyte product during and after long sessions, and salt food normally. Drinking large volumes of plain water while replacing no sodium is the pattern to avoid.',
 'Sports drinks and electrolyte products vary widely in sodium content — check the label rather than assuming. Needs scale with sweat rate, session length, and heat.',
 'Athletes on a sodium-restricted diet or with high blood pressure should follow their physician''s guidance. Electrolyte needs should not be guessed at for anyone with a medical condition affecting fluid balance.',
 'Excessive sodium supplementation can cause stomach upset. Separately and more seriously, drinking very large amounts of plain water while losing sodium can dilute blood sodium — a dangerous condition. More water is not automatically better.',
 'A heavy sweater with three games in a day uses a sports drink between games instead of water alone, and salts his dinner normally.',
 'moderate','published','premium',70
) on conflict (slug) do nothing;

-- 8 --------------------------------------------------- SODIUM BICARBONATE
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'sodium-bicarbonate','Sodium Bicarbonate','supplements',
 'Ordinary baking soda used as a buffering agent before high-intensity exercise. Include this on the list of things to be genuinely careful with.',
 'Intense efforts produce hydrogen ions that contribute to fatigue. Sodium bicarbonate raises the blood''s buffering capacity, which research suggests may help sustain repeated high-intensity efforts of roughly one to several minutes.',
 'Realistically, this is a supplement for older, well-established athletes under professional guidance — not something a youth player should be experimenting with on their own.',
 'If used at all under professional supervision, it must be trialled repeatedly in training first. It should never be tried for the first time before a game that matters, because the gastrointestinal side effects can be severe enough to ruin a performance outright.',
 'Research protocols commonly use doses around 0.2–0.3 g per kg of body weight taken 60–180 minutes before exercise, often split into smaller amounts with food and fluid to reduce stomach upset. This is reported for context, not as a recommendation to self-administer.',
 'Adolescent athletes should not use this without direct supervision from a sports dietitian or physician. Anyone with high blood pressure, kidney disease, heart conditions, or on a sodium-restricted diet should avoid it. Anyone with a sensitive stomach or a history of gastrointestinal problems should be especially cautious.',
 'Nausea, vomiting, bloating, stomach pain and diarrhoea are common and can be severe. It carries a substantial sodium load. The side-effect profile is the main reason many athletes who trial it abandon it.',
 'A college player works with the team''s sports dietitian, trials it across several training sessions to find whether he tolerates it at all, and only then considers using it in competition. Most players who try this route stop at the trial stage.',
 'moderate','published','premium',80
) on conflict (slug) do nothing;

-- 9 -------------------------------------------------------- TART CHERRY
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'tart-cherry','Tart Cherry Juice','recovery',
 'Concentrated tart (sour) cherry juice, used around heavy training or congested competition schedules.',
 'Tart cherries contain polyphenols with antioxidant and anti-inflammatory properties. Research has explored effects on muscle soreness and recovery, and separately on sleep. Findings are promising but less consistent and less established than for something like creatine, which is why the rating here is lower.',
 'Around periods of unusually heavy load — a tournament weekend, a training camp — rather than year-round.',
 'Commonly taken as a concentrate diluted in water, once or twice daily across the days surrounding heavy load.',
 'Research protocols vary in concentration, volume and duration, which is part of why the evidence is harder to summarise. Follow the product label and treat the specifics as unsettled.',
 'Athletes with diabetes should account for the sugar content. Anyone with a fruit allergy should avoid it. As with any supplement, athletes subject to anti-doping rules should use third-party tested products.',
 'It is a sugary juice, so it carries calories worth accounting for. Some stomach upset. There is also an open question in the research about whether blunting inflammation long-term might interfere with training adaptation — another reason to reserve it for congested periods rather than everyday use.',
 'A player facing five games in three days uses it across that weekend, then stops. He does not take it through a normal training block.',
 'emerging','published','premium',90
) on conflict (slug) do nothing;

-- 10 --------------------------------------------------------------- SLEEP
insert into nutrition_secret_sauce (
  slug,title,category,what_it_is,why_it_may_work,when_to_use,how_to_use,
  dosage,who_should_avoid,side_effects,practical_example,
  evidence_rating,status,required_tier,sort_order
) values (
 'sleep-optimization','Sleep — The One That Actually Matters','recovery',
 'Consistent, sufficient sleep, and the nutrition habits around it. If everything else on this list disappeared, this is the one to keep.',
 'Sleep is when a large share of physical recovery and consolidation of skill learning happens. Insufficient sleep is associated with worse reaction time, worse mood, worse decision-making and higher injury risk in athletes. No supplement compensates for being short on it.',
 'Every night. It matters most in exactly the periods players sacrifice it — tournaments, exam weeks, and after late games.',
 'Keep a consistent schedule where possible. Avoid caffeine in the second half of the day, particularly before evening games. Do not go to bed hungry after a late game — a moderate protein and carbohydrate snack is better than lying awake. Keep the room dark and cool, and get screens out of the last stretch before bed.',
 'Guidance for adolescents commonly recommends 8–10 hours per night, with athletes in heavy training often needing the upper end. Most young hockey players get less than this, particularly during tournament weekends.',
 'Persistent sleep problems, loud snoring, or daytime exhaustion despite adequate time in bed should be discussed with a physician rather than managed with supplements.',
 'None from sleeping enough. The costs all sit on the other side — the accumulated deficit from late games, early ice and screens is the single most common recovery problem in youth hockey.',
 'A player with a 9pm game stops caffeine by lunchtime, eats a proper recovery meal on the drive home rather than nothing, and is in bed by midnight instead of scrolling until two. Nothing else on this list will outperform that change.',
 'strong','published','premium',100
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- SOURCES
--
-- Organization + title + year. url and doi intentionally NULL — verify and
-- add them through the admin UI. Do not populate them from memory.
-- ---------------------------------------------------------------------------
insert into nutrition_secret_sauce_sources (secret_sauce_id, organization, title, publication_year, source_type, sort_order)
select s.id, v.org, v.title, v.yr, v.stype, v.ord
from nutrition_secret_sauce s
join (values
  ('creatine-monohydrate','International Society of Sports Nutrition','Position Stand: Safety and Efficacy of Creatine Supplementation in Exercise, Sport, and Medicine',2017,'position stand',0),
  ('creatine-monohydrate','American College of Sports Medicine, Academy of Nutrition and Dietetics, Dietitians of Canada','Joint Position Statement: Nutrition and Athletic Performance',2016,'position stand',1),
  ('chocolate-milk-recovery','American College of Sports Medicine, Academy of Nutrition and Dietetics, Dietitians of Canada','Joint Position Statement: Nutrition and Athletic Performance',2016,'position stand',0),
  ('protein-timing-distribution','International Society of Sports Nutrition','Position Stand: Protein and Exercise',2017,'position stand',0),
  ('protein-timing-distribution','American College of Sports Medicine, Academy of Nutrition and Dietetics, Dietitians of Canada','Joint Position Statement: Nutrition and Athletic Performance',2016,'position stand',1),
  ('carbohydrate-loading','American College of Sports Medicine, Academy of Nutrition and Dietetics, Dietitians of Canada','Joint Position Statement: Nutrition and Athletic Performance',2016,'position stand',0),
  ('caffeine','International Society of Sports Nutrition','Position Stand: Caffeine and Exercise Performance',2021,'position stand',0),
  ('beetroot-nitrate','International Olympic Committee','Consensus Statement: Dietary Supplements and the High-Performance Athlete',2018,'consensus statement',0),
  ('sodium-electrolytes','American College of Sports Medicine','Position Stand: Exercise and Fluid Replacement',2007,'position stand',0),
  ('sodium-bicarbonate','International Olympic Committee','Consensus Statement: Dietary Supplements and the High-Performance Athlete',2018,'consensus statement',0),
  ('tart-cherry','International Olympic Committee','Consensus Statement: Dietary Supplements and the High-Performance Athlete',2018,'consensus statement',0),
  ('sleep-optimization','International Olympic Committee','Consensus Statement on Youth Athletic Development',2015,'consensus statement',0)
) as v(slug, org, title, yr, stype, ord) on v.slug = s.slug
on conflict do nothing;
