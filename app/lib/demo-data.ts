import type { Drill, Lesson, ProBreakdown, Submission } from './types';

/**
 * Seed content used in DEMO MODE (no Supabase env vars set) and as the
 * initial content load for a real database. Replace copy with real videos
 * as they're recorded — the shape stays the same.
 */

export const LESSONS: Lesson[] = [
  // ---- SHOT MECHANICS COURSE (mechanics) ----
  { id: 'l1', slug: 'shot-intro', title: 'Why Your Shot Is Slow', summary: 'The seven mechanics, and why "shoot harder" has never helped anyone.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 380, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l2', slug: 'weight-transfer', title: 'Module 1 — Weight Transfer', summary: 'Loading the back leg and driving through. Hips lead the hands.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 520, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l3', slug: 'stick-flex', title: 'Module 2 — Stick Flex', summary: 'Where most lost velocity actually lives. Puck position and shaft load.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 470, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l4', slug: 'release-timing', title: 'Module 3 — Release Timing', summary: 'When the blade closes, and what you do before it. Deception basics.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 495, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l5', slug: 'hand-positioning', title: 'Module 4 — Hand Positioning', summary: 'Bottom hand drives, top hand pulls. Separation by shot type.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 410, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l6', slug: 'follow-through', title: 'Module 5 — Follow Through', summary: 'Where the blade finishes decides where the puck goes.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 360, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l7', slug: 'balance', title: 'Module 6 — Balance', summary: 'A stable base through release. Stop falling away from the shot.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 340, moduleTitle: 'Shot Mechanics Course' },
  { id: 'l8', slug: 'shooting-posture', title: 'Module 7 — Shooting Posture', summary: 'Knee bend, chest up, shoulders square. The foundation everything sits on.', pillar: 'mechanics', requiredTier: 'basic', durationSec: 390, moduleTitle: 'Shot Mechanics Course' },

  // ---- MINDSET TRACK ----
  { id: 'l9', slug: 'mindset-intro', title: 'The Player Coaches Trust', summary: 'What actually got me an "A" — and why it had nothing to do with skill.', pillar: 'mindset', requiredTier: 'basic', durationSec: 420, moduleTitle: 'Mindset Track' },
  { id: 'l10', slug: 'bounce-back', title: 'The Bounce-Back Protocol', summary: 'A repeatable 20-second reset for the shift after a mistake.', pillar: 'mindset', requiredTier: 'basic', durationSec: 450, moduleTitle: 'Mindset Track' },
  { id: 'l11', slug: 'confidence-is-built', title: 'Confidence Is Built, Not Found', summary: 'Why confidence follows evidence, and how to manufacture the evidence.', pillar: 'mindset', requiredTier: 'basic', durationSec: 480, moduleTitle: 'Mindset Track' },
  { id: 'l12', slug: 'injury-comeback', title: 'Coming Back From Injury', summary: 'I broke my rib twice. Here is exactly how I used the time off.', pillar: 'mindset', requiredTier: 'basic', durationSec: 610, moduleTitle: 'Mindset Track' },
  { id: 'l13', slug: 'pregame-routine', title: 'Building A Pre-Game Routine', summary: 'Same routine, every game, so the big ones feel like the small ones.', pillar: 'mindset', requiredTier: 'basic', durationSec: 400, moduleTitle: 'Mindset Track' },
  { id: 'l14', slug: 'benched', title: 'When The Coach Stops Playing You', summary: 'The conversation to have, and the three weeks that follow it.', pillar: 'mindset', requiredTier: 'basic', durationSec: 520, moduleTitle: 'Mindset Track' },

  // ---- SKILL ----
  { id: 'l15', slug: 'hands-foundation', title: 'Hands — The Foundation', summary: 'Puck control at speed. Ten minutes a day changes everything.', pillar: 'skill', requiredTier: 'basic', durationSec: 430, moduleTitle: 'Skill Development' },
  { id: 'l16', slug: 'edges', title: 'Edges Over Speed', summary: 'Why edge control beats top-end speed at every level below pro.', pillar: 'skill', requiredTier: 'basic', durationSec: 465, moduleTitle: 'Skill Development' },
  { id: 'l17', slug: 'puck-protection', title: 'Protecting The Puck', summary: 'Body position, leverage, and buying the extra half-second.', pillar: 'skill', requiredTier: 'basic', durationSec: 380, moduleTitle: 'Skill Development' },

  // ---- SYSTEMS ----
  { id: 'l18', slug: 'off-season-blueprint', title: 'The Off-Season Blueprint', summary: 'Twelve weeks, mapped. What to do in each one and why.', pillar: 'systems', requiredTier: 'basic', durationSec: 700, moduleTitle: 'Training Systems' },
  { id: 'l19', slug: 'in-season-load', title: 'In-Season Load Management', summary: 'How to keep developing without arriving at playoffs empty.', pillar: 'systems', requiredTier: 'premium', durationSec: 540, moduleTitle: 'Advanced Systems' },
  { id: 'l20', slug: 'periodization', title: 'Periodization For Youth Players', summary: 'Build, peak, recover. The framework pro programs use, scaled down.', pillar: 'systems', requiredTier: 'premium', durationSec: 620, moduleTitle: 'Advanced Systems' },

  // ---- HABITS ----
  { id: 'l21', slug: 'daily-standard', title: 'The Daily Standard', summary: 'The five non-negotiables I ran every day for two years.', pillar: 'habits', requiredTier: 'basic', durationSec: 350, moduleTitle: 'Habits' },
  { id: 'l22', slug: 'practice-structure', title: 'How To Practice Alone', summary: 'Structuring a solo session so it is training, not just puck-shooting.', pillar: 'habits', requiredTier: 'basic', durationSec: 440, moduleTitle: 'Habits' },
  { id: 'l23', slug: 'game-habits', title: 'Game Habits That Get You Played', summary: 'The unglamorous things coaches notice in the first five minutes.', pillar: 'habits', requiredTier: 'basic', durationSec: 410, moduleTitle: 'Habits' },

  // ---- LEADERSHIP ----
  { id: 'l24', slug: 'coachability', title: 'Being Coachable On Purpose', summary: 'What coachable actually looks like from the bench.', pillar: 'leadership', requiredTier: 'basic', durationSec: 390, moduleTitle: 'Leadership' },
  { id: 'l25', slug: 'talking-to-coaches', title: 'How To Talk To Your Coach', summary: 'The exact conversation to have about ice time, and when.', pillar: 'leadership', requiredTier: 'basic', durationSec: 470, moduleTitle: 'Leadership' },
  { id: 'l26', slug: 'recruiting-reality', title: 'How Junior Recruiting Actually Works', summary: 'What scouts look at, when they look, and what parents get wrong.', pillar: 'leadership', requiredTier: 'premium', durationSec: 780, moduleTitle: 'Elite Development' },
];

export const DRILLS: Drill[] = [
  { id: 'd1', slug: 'wall-load', title: 'Wall Load', description: 'Load the shaft against a wall to feel the flex point before you ever shoot a puck.', pillar: 'mechanics', skillTags: ['shooting', 'off-ice'], rubricPoints: [1, 2], difficulty: 1, durationMin: 8, equipment: ['stick', 'wall'], setsReps: '3 × 12 loads each side', requiredTier: 'basic' },
  { id: 'd2', slug: 'weight-shift-ladder', title: 'Weight Shift Ladder', description: 'Progressive back-to-front transfer, starting static and finishing in motion.', pillar: 'mechanics', skillTags: ['shooting', 'off-ice'], rubricPoints: [1, 6], difficulty: 2, durationMin: 12, equipment: ['stick', 'pucks', 'shooting pad'], setsReps: '4 × 10 each stage', requiredTier: 'basic' },
  { id: 'd3', slug: 'quick-release-ladder', title: 'Quick Release Ladder', description: 'Shave time off the release by shortening the load without losing the flex.', pillar: 'mechanics', skillTags: ['shooting'], rubricPoints: [3, 4], difficulty: 3, durationMin: 15, equipment: ['stick', 'pucks', 'net'], setsReps: '5 × 8 shots', requiredTier: 'basic' },
  { id: 'd4', slug: 'puck-position-markers', title: 'Puck Position Markers', description: 'Tape markers force the puck ahead of the blade so the shaft actually loads.', pillar: 'mechanics', skillTags: ['shooting', 'off-ice'], rubricPoints: [2], difficulty: 2, durationMin: 10, equipment: ['tape', 'pucks', 'shooting pad'], setsReps: '3 × 15 shots', requiredTier: 'basic' },
  { id: 'd5', slug: 'hand-separation', title: 'Hand Separation Reps', description: 'Three hand positions, three shot types. Learn which one belongs where.', pillar: 'mechanics', skillTags: ['shooting'], rubricPoints: [4], difficulty: 2, durationMin: 12, equipment: ['stick', 'pucks'], setsReps: '3 × 10 per position', requiredTier: 'basic' },
  { id: 'd6', slug: 'target-finish', title: 'Target Finish', description: 'Finish the blade at a taped corner and hold it. Trains follow-through and accuracy together.', pillar: 'mechanics', skillTags: ['shooting'], rubricPoints: [5], difficulty: 2, durationMin: 12, equipment: ['net', 'tape', 'pucks'], setsReps: '4 × 10 shots', requiredTier: 'basic' },
  { id: 'd7', slug: 'single-leg-load', title: 'Single Leg Load', description: 'Shoot from a single-leg stance to expose and fix balance leaks.', pillar: 'mechanics', skillTags: ['shooting', 'off-ice'], rubricPoints: [6, 7], difficulty: 4, durationMin: 10, equipment: ['stick', 'pucks'], setsReps: '3 × 8 each leg', requiredTier: 'basic' },
  { id: 'd8', slug: 'eyes-up-shooting', title: 'Eyes Up Shooting', description: 'Call the corner out loud before release. Head stays up, puck still goes.', pillar: 'mechanics', skillTags: ['shooting'], rubricPoints: [6, 3], difficulty: 3, durationMin: 12, equipment: ['net', 'pucks'], setsReps: '4 × 10 shots', requiredTier: 'basic' },
  { id: 'd9', slug: 'figure-eight-hands', title: 'Figure Eight Hands', description: 'The ten-minute stickhandling base. Boring, and it works.', pillar: 'skill', skillTags: ['hands', 'off-ice'], rubricPoints: [], difficulty: 1, durationMin: 10, equipment: ['stick', 'ball'], setsReps: '5 × 90 seconds', requiredTier: 'basic' },
  { id: 'd10', slug: 'tight-turn-edges', title: 'Tight Turn Edge Work', description: 'Inside and outside edges through a four-cone box at increasing speed.', pillar: 'skill', skillTags: ['edges', 'on-ice'], rubricPoints: [], difficulty: 3, durationMin: 15, equipment: ['cones', 'skates'], setsReps: '6 × 45 seconds', requiredTier: 'basic' },
  { id: 'd11', slug: 'protect-and-turn', title: 'Protect And Turn', description: 'Body between defender and puck, then escape. Half-second wins games.', pillar: 'skill', skillTags: ['protection', 'on-ice'], rubricPoints: [], difficulty: 3, durationMin: 12, equipment: ['puck', 'partner'], setsReps: '4 × 60 seconds', requiredTier: 'basic' },
  { id: 'd12', slug: 'reset-breath', title: 'The 20-Second Reset', description: 'The exact breathing and cue sequence to run on the bench after a mistake.', pillar: 'mindset', skillTags: ['mental'], rubricPoints: [], difficulty: 1, durationMin: 3, equipment: [], setsReps: 'Every practice, every game', requiredTier: 'basic' },
  { id: 'd13', slug: 'evidence-log', title: 'The Evidence Log', description: 'Three things you did well, written down after every game. Confidence follows evidence.', pillar: 'mindset', skillTags: ['mental', 'journal'], rubricPoints: [], difficulty: 1, durationMin: 5, equipment: ['notebook'], setsReps: 'After every game', requiredTier: 'basic' },
  { id: 'd14', slug: 'pregame-sequence', title: 'Pre-Game Sequence', description: 'A fixed 12-minute sequence so big games feel like every other game.', pillar: 'mindset', skillTags: ['mental', 'routine'], rubricPoints: [], difficulty: 2, durationMin: 12, equipment: [], setsReps: 'Every game day', requiredTier: 'basic' },
  { id: 'd15', slug: 'five-nonnegotiables', title: 'The Five Non-Negotiables', description: 'The daily checklist I ran for two straight years. Five items, fifteen minutes.', pillar: 'habits', skillTags: ['routine'], rubricPoints: [], difficulty: 1, durationMin: 15, equipment: [], setsReps: 'Daily', requiredTier: 'basic' },
  { id: 'd16', slug: 'solo-session-template', title: 'Solo Session Template', description: 'Warm-up, focus block, volume block, finisher. Never waste a session again.', pillar: 'habits', skillTags: ['structure'], rubricPoints: [], difficulty: 2, durationMin: 45, equipment: ['stick', 'pucks', 'pad'], setsReps: '3× per week', requiredTier: 'basic' },
  { id: 'd17', slug: 'first-five-minutes', title: 'First Five Minutes', description: 'The habits coaches notice before they notice anything else.', pillar: 'leadership', skillTags: ['game'], rubricPoints: [], difficulty: 1, durationMin: 5, equipment: [], setsReps: 'Every practice', requiredTier: 'basic' },
  { id: 'd18', slug: 'week-map', title: 'Weekly Load Map', description: 'Map games, practices and training so you peak on the right days.', pillar: 'systems', skillTags: ['planning'], rubricPoints: [], difficulty: 2, durationMin: 15, equipment: ['calendar'], setsReps: 'Every Sunday', requiredTier: 'basic' },
];

/**
 * Elite Release Library.
 *
 * Every clip here must be footage you filmed and have written consent for.
 * No NHL broadcast footage and no third-party social edits — see
 * docs/08-your-film-breakdown.md for why, and for the legitimate routes.
 */
export const PRO_BREAKDOWNS: ProBreakdown[] = [
  { id: 'p1', slug: 'my-junior-a-wrist', title: 'My Wrist Shot — Jr Hockey Season', playerLabel: 'Jr Hockey Forward · Right Shot · Founder', level: 'junior', shotType: 'wrist', shoots: 'right', description: 'My own release, filmed to spec. Watch how little the upper body moves — everything comes from the transfer and the shaft.', releaseFrameMs: 1240 },
  { id: 'p2', slug: 'my-junior-a-snap', title: 'My Snap Shot Off The Catch', playerLabel: 'Jr Hockey Forward · Right Shot · Founder', level: 'junior', shotType: 'snap', shoots: 'right', description: 'The puck is loaded before it arrives. Catch to release in about a third of a second.', releaseFrameMs: 980 },
  { id: 'p3', slug: 'junior-winger-wrist', title: 'Jr Hockey Winger — Wrist Shot', playerLabel: 'Jr Hockey Winger · Left Shot', level: 'junior', shotType: 'wrist', shoots: 'left', description: 'A teammate, filmed with consent. Note the hand separation against the clip above.', releaseFrameMs: 1420 },
  { id: 'p4', slug: 'junior-dman-point', title: 'Jr Hockey Defenceman — Point Shot', playerLabel: 'Jr Hockey Defence · Left Shot', level: 'junior', shotType: 'slap', shoots: 'left', description: 'Getting it through from the blue line is a posture and timing problem, not a power problem.', releaseFrameMs: 1610 },
  { id: 'p5', slug: 'aaa-16u-wrist', title: '16U AAA Forward — Wrist Shot', playerLabel: '16U AAA Forward · Right Shot', level: 'aaa', shotType: 'wrist', shoots: 'right', description: 'A strong AAA release with one clear flaw. See if your player can spot it before I say it.', releaseFrameMs: 1350 },
  { id: 'p6', slug: 'aaa-14u-snap', title: '14U AAA Forward — Snap Shot', playerLabel: '14U AAA Forward · Left Shot', level: 'aaa', shotType: 'snap', shoots: 'left', description: 'The most useful comparison clip on the platform for 12–15 year olds.', releaseFrameMs: 1120 },
];

export const SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    playerName: 'Tyler M.',
    level: 'a',
    shotType: 'wrist',
    status: 'reviewed',
    submittedAt: '2026-07-04T18:20:00Z',
    slaDueAt: '2026-07-07T18:20:00Z',
    reviewedAt: '2026-07-05T22:10:00Z',
    playerNotes: 'Feels like I have no power unless I really wind up.',
    review: {
      overallScore: 41,
      summary:
        'Good hands and a stable base — nothing here is broken. The velocity problem is almost entirely weight transfer and puck position. You are shooting off the back foot and the puck is sitting under your body, so the shaft never loads. Fix those two and the shot changes inside a month without you getting any stronger.',
      focusPoints: [1, 2],
      scores: [
        { rubricPointId: 1, score: 4, note: 'Weight stays on the back leg through release. No hip rotation at all.' },
        { rubricPointId: 2, score: 4, note: 'Puck starts under the body — the shaft never bends.' },
        { rubricPointId: 3, score: 5, note: 'Release is readable. Same wind-up every time.' },
        { rubricPointId: 4, score: 7, note: 'Separation is close to right for a wrist shot.' },
        { rubricPointId: 5, score: 6, note: 'Finishing across the body instead of at the target.' },
        { rubricPointId: 6, score: 8, note: 'Balanced. Head stays up, which is rare at this age.' },
        { rubricPointId: 7, score: 7, note: 'Solid knee bend. Chest could come up slightly.' },
      ],
      annotations: [
        { ms: 3200, rubricPointId: 1, body: 'Freeze here — 90% of your weight is still on the back skate at release.' },
        { ms: 3600, rubricPointId: 2, body: 'The puck is behind your front foot. It needs to be a stick-length ahead.' },
        { ms: 4100, rubricPointId: 5, body: 'Blade finishes across your body. Point it where you want the puck.' },
      ],
      prescribedDrillSlugs: ['weight-shift-ladder', 'puck-position-markers', 'wall-load'],
    },
  },
  {
    id: 's2',
    playerName: 'Tyler M.',
    level: 'a',
    shotType: 'wrist',
    status: 'queued',
    submittedAt: '2026-08-03T14:05:00Z',
    slaDueAt: '2026-08-06T14:05:00Z',
    playerNotes: '30 days after the last one. Worked the weight shift ladder 4x a week.',
  },
  {
    id: 's3',
    playerName: 'Jordan K.',
    level: 'aaa',
    shotType: 'snap',
    status: 'queued',
    submittedAt: '2026-08-02T09:40:00Z',
    slaDueAt: '2026-08-05T09:40:00Z',
    playerNotes: 'Junior camp in 6 weeks. Trying to speed up my release.',
  },
  {
    id: 's4',
    playerName: 'Sam R.',
    level: 'a',
    shotType: 'wrist',
    status: 'in_review',
    submittedAt: '2026-08-01T20:15:00Z',
    slaDueAt: '2026-08-04T20:15:00Z',
    playerNotes: 'First submission.',
  },
];

/** Rule-based weekly plan — deliberately explainable, not a black box. */
export const WEEKLY_PLAN = {
  weekNumber: 3,
  theme: 'Weight Transfer & Release',
  focusPillar: 'mechanics' as const,
  days: [
    { day: 'Mon', lessonSlug: 'weight-transfer', drills: ['wall-load', 'weight-shift-ladder'], minutes: 20, done: true },
    { day: 'Tue', lessonSlug: 'reset-breath', drills: ['reset-breath', 'figure-eight-hands'], minutes: 15, done: true },
    { day: 'Wed', lessonSlug: 'stick-flex', drills: ['puck-position-markers'], minutes: 18, done: false },
    { day: 'Thu', lessonSlug: 'release-timing', drills: ['quick-release-ladder'], minutes: 22, done: false },
    { day: 'Fri', lessonSlug: 'daily-standard', drills: ['five-nonnegotiables'], minutes: 15, done: false },
    { day: 'Sat', lessonSlug: null, drills: [], minutes: 0, done: false },
    { day: 'Sun', lessonSlug: 'week-map', drills: ['evidence-log', 'week-map'], minutes: 20, done: false },
  ],
};

export const DEMO_PLAYER = {
  firstName: 'Tyler',
  level: 'a' as const,
  position: 'forward' as const,
  shoots: 'right' as const,
  streak: 12,
  sessionsCompleted: 34,
  shotScore: 52,
  shotScorePrev: 41,
  analysisCredits: 2,
  pillarProgress: {
    mindset: 62,
    mechanics: 48,
    skill: 55,
    systems: 30,
    habits: 71,
    leadership: 40,
  } as Record<string, number>,
};
