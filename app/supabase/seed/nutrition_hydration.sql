-- ---------------------------------------------------------------------------
-- HYDRATION & EDUCATION — SEED
--
-- NOT A MIGRATION. Content only, applied separately so migration state stays
-- exactly as reconciled. Re-runnable via ON CONFLICT DO NOTHING on slug.
--
-- These go into the EXISTING nutrition_resources table (markdown body_md),
-- not into a new table. That table was built for exactly this — long-form
-- educational content — and reusing it avoids a second content system.
--
-- DELIBERATE POSITION ON HYDRATION NUMBERS
-- There is no single correct daily fluid figure for every athlete. Sweat rate
-- varies enormously with body size, equipment, rink temperature, intensity and
-- individual physiology. This content teaches players to measure their own
-- losses rather than handing them a number that is wrong for most of them.
-- It also states plainly that forcing large volumes of plain water is not
-- safe, because "drink more water" advice given without that caveat has
-- caused real harm.
-- ---------------------------------------------------------------------------

insert into nutrition_resources (slug, title, category, body_md, required_tier, is_published)
values (
'hydration-guide',
'The Mindset Hockey Hydration Guide',
'hydration',
$md$
# Hydration for hockey players

Hockey is a hard sport to stay hydrated in. You are in full equipment, working in
repeated maximal bursts, in a building that is cold at ice level and often warm in
the stands. Players sweat far more than they think, and because the air is cold
they often do not feel thirsty until they are well behind.

**There is no single number that is right for everyone.** Anyone who tells you
"drink X litres a day" is guessing about you specifically. What follows is how to
work out your own.

---

## Daily hydration

Start the day with a glass of water, drink with every meal, and keep a bottle with
you. That habit alone puts most players in reasonable shape.

**A practical check:** urine that is pale yellow, most of the time, is a
reasonable sign you are in a normal range. Very dark urine suggests you are
behind. Completely clear urine all day may mean you are drinking more than you
need.

**The limits of that check.** Urine colour is a rough guide, not a measurement.
Some vitamin supplements turn urine bright yellow regardless of hydration. First
thing in the morning it is usually darker. Use it as one signal among several,
not as proof.

---

## Working out your own sweat rate

This is the single most useful thing in this guide, and it takes one practice.

1. Weigh yourself, in minimal clothing, immediately before a practice.
2. Train as normal. Track roughly how much you drink during the session.
3. Weigh yourself again immediately afterwards, in the same clothing, after
   towelling off.

Weight lost during the session is mostly fluid. Roughly, **each kilogram lost is
about a litre of sweat** — add back whatever you drank during the session to get
your total loss.

Do this on a hot day and a normal day. You will likely find your losses are
higher than you assumed, and that they vary a lot between sessions. That is the
point: you now know *your* number instead of a generic one.

---

## Before practice

Arrive hydrated rather than trying to fix it in the room. Drink normally through
the day and have some fluid in the hour or two beforehand.

Do not force down a large volume right before you go on. It will sit in your
stomach and you will feel it in the first shift.

## During practice

For a normal-length practice, water is usually enough.

For longer or harder sessions, or in a warm rink, a drink containing carbohydrate
and electrolytes may be more useful than plain water — it replaces some of what
you are losing rather than just the fluid.

Drink at the natural breaks. You do not need to force it on every whistle.

## After practice

Replace fluid steadily over the next few hours rather than all at once. Include
some sodium — from a sports drink, or simply by salting your food normally.
Sodium helps you keep the fluid you drink instead of passing it straight through.

---

## Game day

**Through the day:** drink normally with meals. Game day is not the day to
suddenly double your intake.

**The hour before:** modest amounts. Enough that you are not thirsty, not so much
that you are uncomfortable.

**During the game:** drink at whistles and between periods. Between periods is the
real opportunity — that is when you can take in a meaningful amount.

**After:** start replacing fluid before you leave the rink. Pair it with something
containing sodium and carbohydrate.

---

## Tournaments and back-to-back games

This is where hydration actually decides outcomes, because the deficit compounds.

- Between games, drinking plain water alone is usually not enough. Use a sports
  drink or pair water with salty food.
- Keep a bottle with you in the hotel, not just at the rink.
- Do not wait until the next warmup to start catching up.
- If you have three games in a day, treat fluid and sodium as part of the plan,
  not an afterthought.

---

## Signs you are behind

- Dark urine, or not needing to go for a long stretch
- Headache
- Unusual fatigue late in a game
- Feeling slower or foggier than the session warrants
- Salt marks on your skin or gear after you dry off

---

## The other direction — and this one matters

**More water is not automatically better.** Drinking very large volumes of plain
water while losing sodium through sweat can dilute the sodium in your blood. That
is a genuine medical problem, not a theoretical one, and it has occurred in
athletes who were told simply to "drink as much as possible".

Signs to take seriously: nausea, headache, confusion, or swelling in the hands and
feet alongside very high fluid intake. If that happens, seek medical help.

The goal is replacing what you lose — not drinking the maximum you can manage.

---

## When to ask someone qualified

Talk to a physician or a sports dietitian if you:

- cramp frequently despite drinking and salting food normally
- have a medical condition affecting fluid or sodium balance
- take medication affecting blood pressure or fluid balance
- have had a heat illness before

This guide is general education for healthy athletes. It is not medical advice
and it does not replace individual assessment.
$md$,
'premium', true
) on conflict (slug) do nothing;

insert into nutrition_resources (slug, title, category, body_md, required_tier, is_published)
values (
'tournament-nutrition-guide',
'Tournament Nutrition — The Weekend Plan',
'tournament',
$md$
# Tournament nutrition

Three games in two days is a different problem from one game a week. The issue is
not any single meal — it is that the deficit compounds, and by game three you are
running on whatever you managed to put back.

---

## The night before

- **Carbohydrate-forward dinner.** Pasta, rice, potato. This is when you top up
  muscle glycogen.
- **Familiar food only.** Not the night to try the new restaurant.
- **Moderate fat and fibre** so digestion is settled in the morning.
- **Drink normally** with dinner and through the evening.
- **Get to bed.** Sleep is the recovery tool that outperforms everything else on
  a tournament weekend, and it is the first thing players give up.

## Morning of game one

Eat 3 to 4 hours before puck drop if you can. See *Hotel Room Tournament
Breakfast* in the cookbook for a plate you can actually build from a hotel
breakfast bar.

If the game is too early for that, eat a smaller carbohydrate-based breakfast
90 minutes out — a bagel with jam and a banana — rather than nothing at all.

## Between games

This is the part most teams get wrong.

**Gap of 1–2 hours:** liquid and light. A recovery drink, a banana, some pretzels.
Do not eat a full meal.

**Gap of 3–4 hours:** a proper meal, weighted toward carbohydrate with moderate
protein. Chicken and rice, a turkey sandwich, pasta.

**Gap of 4+ hours:** normal meal, then a smaller snack about 90 minutes before the
next game.

In every case: start replacing fluid and sodium immediately after the previous
game, not when you arrive back at the rink.

## After the last game

Full recovery meal within a couple of hours — carbohydrate, protein, fluid,
sodium. Then sleep. If you have another tournament day tomorrow, this meal is
part of tomorrow's performance, not just today's cleanup.

---

## What to pack

Assume the rink will have nothing useful and the hotel will have a kettle.

- Bagels, bread, tortillas
- Peanut butter, jam
- Bananas, apples, oranges
- Granola bars, trail mix, pretzels
- Beef jerky
- Instant oatmeal packets
- Shelf-stable chocolate milk or ready-to-drink protein shakes
- A large refillable water bottle
- Sports drink powder or electrolyte tablets

A cooler with yogurt, deli turkey and chocolate milk turns a hotel room into a
functioning kitchen.

---

## The rule that matters most

Do not try anything new on a tournament weekend. Not a new supplement, not a new
pre-game meal, not a restaurant you have never eaten at. Tournaments are for
executing what you already know works.
$md$,
'premium', true
) on conflict (slug) do nothing;

insert into nutrition_resources (slug, title, category, body_md, required_tier, is_published)
values (
'recovery-nutrition-guide',
'Recovery Nutrition — After the Buzzer',
'recovery',
$md$
# Recovery nutrition

Recovery is not one drink. It is four things, and skipping any of them leaves work
on the table.

**Carbohydrate** — refills the muscle glycogen you emptied.
**Protein** — supplies what your body needs to repair muscle.
**Fluid** — replaces sweat losses.
**Sodium** — helps you hold onto the fluid you just drank.

Most players do one of the four and consider it handled.

---

## The window, honestly

You may have heard about a 30-minute anabolic window. That idea has been
substantially overstated. Total intake across the day matters more than hitting a
narrow window after training.

**But timing is not irrelevant.** It matters most when:

- you have another session or game within about 8 hours
- you finished very depleted
- you will not otherwise eat for a long stretch

For a single evening practice followed by dinner at home and a normal breakfast,
you do not need to sprint to a shaker bottle. For game two of a tournament in four
hours, you do.

---

## What that looks like in practice

**Immediately after (0–30 min), when the next session is soon:**
Chocolate milk and a banana. A recovery smoothie. A ready-to-drink shake and some
pretzels. Something you will actually consume on a bus.

**Within about two hours:**
A real meal. Chicken and rice, pasta with lean meat, a rice bowl, salmon and
potato. This is where the bulk of the work happens.

**Before bed after a late game:**
Do not go to bed hungry after a night game — you will sleep worse and recover
less. A moderate protein and carbohydrate snack is better than nothing. Greek
yogurt with fruit, or milk and toast.

---

## When you do not feel like eating

Common after a hard game, and completely normal. Adrenaline suppresses appetite.

Drink your recovery instead: a smoothie, chocolate milk, a shake. Liquid goes down
when food will not. Then eat properly when your appetite returns an hour later.

The worst outcome is eating nothing at all because you did not feel like a meal.

---

## Sleep is part of recovery nutrition

A large share of physical recovery happens while you sleep. Two habits protect it:

- **No caffeine in the second half of the day**, especially before evening games.
- **Do not go to bed hungry**, and do not go to bed having just eaten an enormous
  heavy meal either.

If you had to choose between a perfect recovery meal on four hours of sleep, or a
decent meal on nine, take the sleep.

---

## A note on supplements

Nothing in this guide requires a supplement. Food does this job. Supplements are
covered separately in the Secret Sauce section, with evidence ratings and
cautions, and none of them is presented as necessary.

If you have a medical condition, a food allergy, a history of disordered eating,
or you are unsure how to fuel around a specific schedule, speak to a physician or
a sports dietitian. This is general education for healthy athletes, not individual
medical advice.
$md$,
'premium', true
) on conflict (slug) do nothing;
