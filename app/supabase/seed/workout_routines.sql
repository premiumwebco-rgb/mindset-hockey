-- ============================================================================
-- STRUCTURED WORKOUT ROUTINES (10 routines)
--
-- Plain SQL seed, not a migration — no schema change. Reuses workout_plans +
-- workout_sessions exactly as they already exist (see 0002_membership_platform.sql).
-- Each routine is one workout_plans row with phase = 'routine' (a new but
-- unconstrained text value — the column has no check constraint) and exactly
-- one linked workout_sessions row whose `blocks` jsonb holds the structure:
--
--   { "difficulty": "...", "whenToUse": "...", "coachTip": "...",
--     "sections": [ { "name": "WARM-UP", "items": [ { "name", "duration"
--       | "sets"/"reps"/"rest", "instructions" } ] }, ... ] }
--
-- required_tier = 'basic' — these are broadly-available content-library
-- material (like drills and nutrition guides), not a premium-exclusive
-- feature, consistent with the page-level gate (requireFeature('workout_plans')
-- already only requires 'basic'). Flagged in the phase report in case the
-- business wants these premium-only instead — trivial to change with an
-- UPDATE, no code change needed.
--
-- This file matches exactly what was applied via execute_sql (plain ASCII
-- quotes throughout to avoid encoding issues across tools).
-- ============================================================================

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('pre-game-activation', 'Pre-Game Activation',
    'A 15-minute activation sequence to run through once you''re dressed, so you walk out of the room ready instead of cold.',
    'routine', 'pre-game', 1, 'basic', true, 10)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Pre-Game Activation', 15, $j${
  "difficulty": "easy",
  "whenToUse": "60-90 minutes before puck drop, once you're dressed and the room is quiet enough to move.",
  "coachTip": "This is about waking the body up, not tiring it out — stay light and controlled the whole way through.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Dynamic Mobility", "duration": "3 min", "instructions": "Easy jog or bike in place, then leg swings and arm circles. Get a light sweat going before anything else." }
    ]},
    { "name": "ACTIVATION", "items": [
      { "name": "Hip Activation", "duration": "2 min", "instructions": "10 forward leg swings and 10 lateral leg swings per leg, holding something for balance." },
      { "name": "Core Activation", "duration": "2 min", "instructions": "30-second plank, then 10 bird dogs per side." },
      { "name": "Lower-Body Activation", "duration": "3 min", "sets": 2, "reps": "10", "instructions": "2 sets of 10 bodyweight squats, then 10 walking lunges per leg." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Movement Prep", "duration": "3 min", "instructions": "Alternate 20 seconds of skater hops and 20 seconds of high knees, resting 10 seconds between. Repeat twice." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Mental Visualization", "duration": "2 min", "instructions": "Close your eyes. Picture your first shift in detail — first touch, first battle, first shot — and see yourself handling it well." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('pre-practice-activation', 'Pre-Practice Activation',
    'A quick 10-minute sequence that gets you moving before practice without eating into warm-up time on the ice.',
    'routine', 'pre-practice', 1, 'basic', true, 20)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Pre-Practice Activation', 10, $j${
  "difficulty": "easy",
  "whenToUse": "In the room or the lobby, 15-20 minutes before you step on the ice.",
  "coachTip": "Practice moves fast — this is meant to be quick enough that you can do it every single time, not just when you remember.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Easy Movement", "duration": "2 min", "instructions": "Jog in place or march with high knees to get blood moving." }
    ]},
    { "name": "ACTIVATION", "items": [
      { "name": "Hip & Glute Activation", "duration": "3 min", "instructions": "10 glute bridges, 10 hip circles per side, 10 lateral band walks or bodyweight side steps if no band." },
      { "name": "Core Activation", "duration": "2 min", "instructions": "20-second plank, 10 dead bugs per side." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Quick Feet", "duration": "3 min", "instructions": "20 seconds of fast feet in place, 10 seconds rest, repeat 6 times." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('post-practice-recovery', 'Post-Practice Recovery',
    'A 15-minute cooldown built to bring the heart rate down and start recovery before you even leave the rink.',
    'routine', 'post-practice-recovery', 1, 'basic', true, 30)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Post-Practice Recovery', 15, $j${
  "difficulty": "easy",
  "whenToUse": "Right after practice, before you get in the car — even a few minutes here beats skipping it entirely.",
  "coachTip": "The breathing at the end matters more than it looks like it should — it is what actually shifts your body out of game mode.",
  "sections": [
    { "name": "COOLDOWN", "items": [
      { "name": "Easy Movement", "duration": "3 min", "instructions": "Easy walk or light bike to bring the heart rate down gradually rather than stopping cold." }
    ]},
    { "name": "MOBILITY", "items": [
      { "name": "Lower-Body Stretching", "duration": "6 min", "instructions": "Hold each: hip flexor stretch, hamstring stretch, quad stretch, calf stretch — 45 seconds per side." },
      { "name": "Upper-Body & Spine Stretching", "duration": "4 min", "instructions": "Cross-body shoulder stretch, cat-cow, seated spinal twist — 45 seconds each." }
    ]},
    { "name": "BREATHING", "items": [
      { "name": "Recovery Breathing", "duration": "2 min", "instructions": "Lie or sit comfortably. Breathe in for 4 counts, hold for 4, out for 6. Repeat for 2 minutes." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('game-day-routine', 'Game Day Routine',
    'A structure for the whole day of a game — from breakfast to the final recovery window that night.',
    'routine', 'game-day', 1, 'basic', true, 40)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Game Day Routine', null, $j${
  "difficulty": "moderate",
  "whenToUse": "The full day of a game, structured around puck drop rather than the clock.",
  "coachTip": "The routine matters more than the exact times — the goal is a predictable day, not a rigid schedule you stress about hitting to the minute.",
  "sections": [
    { "name": "MORNING", "items": [
      { "name": "Hydration", "instructions": "Start the day with a full glass of water before anything else." },
      { "name": "Breakfast", "instructions": "A real breakfast with protein and carbs — see the Nutrition cookbook Pre-Game category for options." },
      { "name": "Mobility", "instructions": "5-10 minutes of easy movement and stretching, nothing intense." },
      { "name": "Mindset", "instructions": "A few minutes reviewing your pre-game routine from the Mindset section so game day does not start reactive." }
    ]},
    { "name": "3-4 HOURS BEFORE", "items": [
      { "name": "Pre-Game Meal", "instructions": "A full meal timed 3-4 hours out — see the Nutrition cookbook Pre-Game or Tournament categories." },
      { "name": "Hydration", "instructions": "Keep sipping water steadily through the afternoon rather than chugging right before warm-up." }
    ]},
    { "name": "60-90 MINUTES BEFORE", "items": [
      { "name": "Activation", "instructions": "Run the Pre-Game Activation routine (15 minutes) once you are dressed." },
      { "name": "Visualization", "instructions": "A few minutes picturing your first shift, as in the Pre-Game Activation routine." },
      { "name": "Final Preparation", "instructions": "Gear check, stick check, and whatever settles your own head before the anthem." }
    ]},
    { "name": "POST-GAME", "items": [
      { "name": "Recovery Nutrition", "instructions": "A recovery meal or shake within the first hour — see the Nutrition cookbook Post-Game category." },
      { "name": "Cooldown", "instructions": "Run the Post-Practice Recovery routine to bring the body back down." },
      { "name": "Hydration", "instructions": "Replace fluids lost to sweat — more than feels necessary is usually about right." },
      { "name": "Sleep Preparation", "instructions": "Wind down screens and stimulation earlier than usual — a game raises adrenaline more than practice does." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('strength-day', 'Strength Day',
    'A full strength session covering the major movement patterns, built for a rink-adjacent gym or a home setup with basic equipment.',
    'routine', 'strength-day', 1, 'basic', true, 50)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Strength Day', 45, $j${
  "difficulty": "moderate",
  "whenToUse": "Off-ice training days, ideally not the day right before a game.",
  "coachTip": "Add weight only when every rep of every set looks the same as the first one — form breaking down is the signal to hold, not push.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "General Warm-Up", "duration": "5 min", "instructions": "Easy bike or jog, then arm circles and leg swings." }
    ]},
    { "name": "ACTIVATION", "items": [
      { "name": "Movement Prep", "duration": "5 min", "instructions": "Bodyweight squats, glute bridges and band walks or side steps — 10 reps each." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Squat Pattern (goblet or bodyweight squat)", "sets": 3, "reps": "8-10", "rest": "90s", "instructions": "Control the descent, drive up through the whole foot." },
      { "name": "Push Pattern (push-up or dumbbell press)", "sets": 3, "reps": "8-10", "rest": "90s", "instructions": "Full range of motion, no rushing the last few reps." },
      { "name": "Pull Pattern (row or band pull)", "sets": 3, "reps": "10-12", "rest": "90s", "instructions": "Squeeze the shoulder blades together at the top of every rep." },
      { "name": "Core (plank or dead bug)", "sets": 3, "reps": "30-45s", "rest": "45s", "instructions": "Keep the lower back flat against the floor on dead bugs; no sagging hips on planks." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Stretch", "duration": "5 min", "instructions": "Hold hip flexor, hamstring and chest stretches for 30-45 seconds each." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('speed-agility-day', 'Speed & Agility Day',
    'Acceleration, lateral movement and change of direction — the off-ice work that shows up as first-step quickness on the ice.',
    'routine', 'speed-agility', 1, 'basic', true, 60)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Speed & Agility Day', 30, $j${
  "difficulty": "moderate",
  "whenToUse": "Off-ice training days when legs are fresh — this is quality-over-fatigue work, not a conditioning grind.",
  "coachTip": "Full recovery between reps matters here more than in a strength session — you are training speed, and tired legs teach slow mechanics.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Dynamic Warm-Up", "duration": "5 min", "instructions": "Jog, high knees, butt kicks, leg swings — build up gradually, do not sprint cold." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Acceleration Sprints", "sets": 4, "reps": "10 yards", "rest": "60s", "instructions": "Explosive start from a stance, full recovery between reps." },
      { "name": "Lateral Shuffle", "sets": 3, "reps": "10 yards each way", "rest": "45s", "instructions": "Stay low, quick feet, do not cross your feet." },
      { "name": "Reaction Drill", "sets": 4, "reps": "5 sec burst", "rest": "45s", "instructions": "Have someone call a direction and react — or use a ball drop/bounce as the cue." },
      { "name": "Change of Direction (5-10-5 shuttle or similar)", "sets": 3, "reps": "1 rep", "rest": "90s", "instructions": "Plant hard, do not round the turns — sharp angles, not curves." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Easy Movement", "duration": "3 min", "instructions": "Easy walk and light stretching for the legs." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('recovery-day', 'Recovery Day',
    'A full mobility and light-movement session for the day after a heavy game or training block.',
    'routine', 'recovery-day', 1, 'basic', true, 70)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Recovery Day', 20, $j${
  "difficulty": "easy",
  "whenToUse": "The day after a game or a hard training day, or any day the body just feels beat up.",
  "coachTip": "This is a real training day, not an off day — recovery work is what lets the next hard day actually be hard.",
  "sections": [
    { "name": "MOBILITY", "items": [
      { "name": "Full-Body Mobility", "duration": "10 min", "instructions": "Move slowly through hips, ankles, thoracic spine and shoulders — foam roll if you have one, otherwise controlled stretching." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Light Movement", "duration": "5 min", "instructions": "Easy walk, light bike, or a slow swim — nothing that raises your heart rate much." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Breathing & Stretch", "duration": "5 min", "instructions": "Slow breathing (4 in, 4 hold, 6 out) combined with holding your tightest 2-3 stretches from the day." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('off-ice-shooting-day', 'Off-Ice Shooting Day',
    'A focused block of shooting reps in the driveway or basement, built around the same mechanics the AI Shot Analysis grades.',
    'routine', 'off-ice-shooting', 1, 'basic', true, 80)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Off-Ice Shooting Day', 25, $j${
  "difficulty": "moderate",
  "whenToUse": "Any day you have a shooting pad, tarp or smooth surface and 25 minutes.",
  "coachTip": "If your AI Shot Analysis flagged a specific weak category — release, balance, weight transfer — spend extra reps there instead of splitting everything evenly.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Hand & Wrist Warm-Up", "duration": "3 min", "instructions": "Stickhandle a puck or ball loosely, then roll the wrists and stretch the forearms." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Wrist Shot Reps", "sets": 3, "reps": "10", "rest": "30s", "instructions": "Focus on weight transfer and a clean release — quality over how hard you are shooting." },
      { "name": "Release Speed Reps", "sets": 3, "reps": "10", "rest": "30s", "instructions": "Catch-and-release, minimizing the drag time before the puck leaves the blade." },
      { "name": "One-Timer Reps", "sets": 3, "reps": "8", "rest": "45s", "instructions": "Have a feed passed or bounced to you if possible — timing is the whole point of this rep." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Stretch", "duration": "3 min", "instructions": "Stretch the forearms, shoulders and lower back." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('travel-hotel-workout', 'Travel / Hotel Workout',
    'A no-equipment bodyweight session for tournament weekends, built to fit a hotel room.',
    'routine', 'travel-hotel', 1, 'basic', true, 90)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Travel / Hotel Workout', 20, $j${
  "difficulty": "easy",
  "whenToUse": "Tournament weekends or any trip where the only equipment is the floor.",
  "coachTip": "Keep the noise down for the neighbors below you — this is all low-impact on purpose.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Easy Movement", "duration": "3 min", "instructions": "March in place, arm circles, bodyweight squats to loosen up." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Bodyweight Circuit", "duration": "12 min", "sets": 3, "reps": "45s work / 15s rest", "instructions": "Rotate through: squats, push-ups, reverse lunges, plank, glute bridges. 45 seconds each, 15 seconds to switch, 3 rounds." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Stretch", "duration": "5 min", "instructions": "Hold hip, hamstring and shoulder stretches for 30-45 seconds each." }
    ]}
  ]
}$j$::jsonb
from plan;

with plan as (
  insert into workout_plans (slug, title, description, phase, focus, weeks, required_tier, is_published, sort_order)
  values ('quick-15-workout', 'Quick 15-Minute Workout',
    'A short full-body session for the days a full workout is not realistic but 15 minutes is.',
    'routine', 'quick-15', 1, 'basic', true, 100)
  returning id
)
insert into workout_sessions (plan_id, week, day, title, duration_min, blocks)
select id, 1, 1, 'Quick 15-Minute Workout', 15, $j${
  "difficulty": "easy",
  "whenToUse": "Busy days when a full strength or agility session is not going to happen, but something still can.",
  "coachTip": "Fifteen consistent minutes most days beats one long session a week — this routine exists so no time is rarely a real excuse.",
  "sections": [
    { "name": "WARM-UP", "items": [
      { "name": "Quick Warm-Up", "duration": "2 min", "instructions": "March or jog in place, arm circles." }
    ]},
    { "name": "MAIN WORK", "items": [
      { "name": "Full-Body Circuit", "duration": "10 min", "sets": 2, "reps": "40s work / 20s rest", "instructions": "Rotate through: squats, push-ups, mountain climbers, plank. 40 seconds each, 20 seconds rest, 2 rounds." }
    ]},
    { "name": "COOLDOWN", "items": [
      { "name": "Stretch", "duration": "3 min", "instructions": "Quick hold on hips, hamstrings and shoulders." }
    ]}
  ]
}$j$::jsonb
from plan;

-- ============================================================================
-- VERIFY
-- ============================================================================
--   select count(*) from workout_plans where phase = 'routine';       -- expect 10
--   select count(*) from workout_sessions ws join workout_plans p on p.id = ws.plan_id where p.phase = 'routine'; -- expect 10
--   select slug from workout_plans where phase='routine' group by slug having count(*) > 1; -- expect 0 rows
-- ============================================================================
