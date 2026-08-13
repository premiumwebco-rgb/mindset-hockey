/* ==========================================================================
   MINDSET HOCKEY — shared domain types
   ========================================================================== */

/** Membership tiers. `none` = signed up but not paid. */
export type Tier = 'none' | 'basic' | 'premium';

/** Application roles. Distinct from tier: an admin has full access regardless. */
export type Role = 'member' | 'coach' | 'admin';

export const TIER_RANK: Record<Tier, number> = { none: 0, basic: 1, premium: 2 };

export const TIER_LABEL: Record<Tier, string> = {
  none: 'No active plan',
  basic: 'Standard',
  premium: 'Premium',
};

export type Pillar =
  | 'mindset'
  | 'mechanics'
  | 'skill'
  | 'systems'
  | 'habits'
  | 'leadership';

export type PlayLevel = 'house' | 'a' | 'aa' | 'aaa' | 'prep' | 'junior' | 'college';
export type ShotType = 'wrist' | 'snap' | 'slap' | 'backhand' | 'one_timer';
export type Position = 'forward' | 'defense' | 'goalie';

/**
 * Reference-clip level. Deliberately excludes NHL broadcast footage.
 * Use clips you filmed and have consent for, or official embeds that stay on
 * the rights-holder's player.
 */
export type ProLevel = 'junior' | 'aaa' | 'college';

export type SubmissionStatus =
  | 'uploading'
  | 'queued'
  | 'analyzing'
  | 'analyzed'
  | 'in_review'
  | 'reviewed'
  | 'failed';

export type SubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

/** Statuses that grant access. Anything else revokes it. */
export const ACTIVE_SUB_STATUSES: SubscriptionStatus[] = ['trialing', 'active'];

export const PILLARS: { key: Pillar; label: string; blurb: string }[] = [
  { key: 'mindset', label: 'Mindset', blurb: 'Confidence, bounce-back, adversity, routine' },
  { key: 'mechanics', label: 'Mechanics', blurb: 'The 7-point shot framework' },
  { key: 'skill', label: 'Skill', blurb: 'Hands, edges, protection, deception' },
  { key: 'systems', label: 'Systems', blurb: 'Weekly plans, periodization, recovery' },
  { key: 'habits', label: 'Habits', blurb: 'Daily standards, practice and game habits' },
  { key: 'leadership', label: 'Leadership', blurb: 'Coachability, communication, trust' },
];

/* ---------------------------------------------------------------------------
   The 10-point shot analysis rubric — the coaching IP behind video review.
   Used by the coach review editor and the shot-mechanics course.
--------------------------------------------------------------------------- */
export interface RubricPoint {
  id: number;
  key: string;
  label: string;
  /** What good looks like — also used as the AI scoring criterion. */
  looksLike: string;
  commonFlaw: string;
  fix: string;
  /** Whether this point is reliably gradeable from a phone video. */
  gradeableFromPhone: boolean;
}

export const RUBRIC: RubricPoint[] = [
  {
    id: 1,
    key: 'shooting_stance',
    label: 'Shooting Stance',
    looksLike: 'Athletic base, feet roughly shoulder width, knees bent, chest up.',
    commonFlaw: 'Upright and narrow, or bent at the waist instead of the knees.',
    fix: 'Stance holds, mirror and film checks',
    gradeableFromPhone: true,
  },
  {
    id: 2,
    key: 'weight_transfer',
    label: 'Weight Transfer',
    looksLike: 'Loads the back leg and drives through to the front; hips lead the hands.',
    commonFlaw: 'Shooting off the back foot with no hip rotation.',
    fix: 'Weight-shift ladder, wall-load reps',
    gradeableFromPhone: true,
  },
  {
    id: 3,
    key: 'balance',
    label: 'Balance',
    looksLike: 'Stable base through release; head steady and eyes up.',
    commonFlaw: 'Falling away from the shot; head dropping to the puck.',
    fix: 'Single-leg loading, eyes-up shooting',
    gradeableFromPhone: true,
  },
  {
    id: 4,
    key: 'lower_body',
    label: 'Lower Body Mechanics',
    looksLike: 'Drive comes from the legs; front knee tracks over the foot.',
    commonFlaw: 'All arms — legs stay passive through the shot.',
    fix: 'Split-squat loading, leg-drive isolation reps',
    gradeableFromPhone: true,
  },
  {
    id: 5,
    key: 'hand_positioning',
    label: 'Hand Positioning',
    looksLike: 'Bottom hand drives, top hand pulls; correct separation for the shot type.',
    commonFlaw: 'Hands too close together; passive bottom hand.',
    fix: 'Hand-separation reps by shot type',
    gradeableFromPhone: true,
  },
  {
    id: 6,
    key: 'stick_flex',
    label: 'Stick Flex / Loading',
    looksLike: 'Puck ahead of the blade, loading the shaft into the ice.',
    commonFlaw: 'Puck too close to the body; no visible bend in the shaft.',
    fix: 'Flex-point drills, puck-position markers',
    gradeableFromPhone: true,
  },
  {
    id: 7,
    key: 'release_point',
    label: 'Release Point',
    looksLike: 'Puck leaves at the toe with the blade closing at the right instant.',
    commonFlaw: 'Releasing too early or dragging the puck too long.',
    fix: 'Release-window reps, target ladders',
    gradeableFromPhone: true,
  },
  {
    id: 8,
    key: 'follow_through',
    label: 'Follow Through',
    looksLike: 'Blade finishes at the target with full extension.',
    commonFlaw: 'Cutting the finish short; blade rolling open.',
    fix: 'Target-finish reps, frame-by-frame film',
    gradeableFromPhone: true,
  },
  {
    id: 9,
    key: 'body_positioning',
    label: 'Body Positioning',
    looksLike: 'Shoulders square to intent, hips open through the release.',
    commonFlaw: 'Shoulders closed, telegraphing where the puck is going.',
    fix: 'Deception reps, shoulder-alignment film checks',
    gradeableFromPhone: true,
  },
  {
    id: 10,
    key: 'consistency',
    label: 'Consistency',
    looksLike: 'Mechanics repeat across every rep in the clip.',
    commonFlaw: 'One good rep in five; no repeatable pattern.',
    fix: 'Volume with a quality standard, rep logging',
    /** Needs several reps in one clip — flagged so the UI can ask for more. */
    gradeableFromPhone: true,
  },
];

export const RUBRIC_BY_KEY: Record<string, RubricPoint> = Object.fromEntries(
  RUBRIC.map((r) => [r.key, r])
);

export const MAX_RUBRIC_SCORE = RUBRIC.length * 10;

/* ---------------------------------------------------------------------------
   Library content types — training library, drill database, reference clips.
--------------------------------------------------------------------------- */
export interface Lesson {
  id: string;
  slug: string;
  title: string;
  summary: string;
  pillar: Pillar;
  requiredTier: Tier;
  durationSec: number;
  moduleTitle?: string;
}

export interface Drill {
  id: string;
  slug: string;
  title: string;
  description: string;
  pillar: Pillar;
  skillTags: string[];
  rubricPoints: number[];
  difficulty: number;
  durationMin: number;
  equipment: string[];
  setsReps: string;
  requiredTier: Tier;
}

export interface ProBreakdown {
  id: string;
  slug: string;
  title: string;
  playerLabel: string;
  level: ProLevel;
  shotType: ShotType;
  shoots: 'left' | 'right';
  description: string;
  releaseFrameMs: number;
}

export interface ReviewScore {
  rubricPointId: number;
  score: number;
  note: string;
}

/** Coach-review submission shape, used by the coach queue and review editor. */
export interface Submission {
  id: string;
  playerName: string;
  level: PlayLevel;
  shotType: ShotType;
  status: SubmissionStatus;
  submittedAt: string;
  slaDueAt: string;
  reviewedAt?: string;
  playerNotes?: string;
  review?: {
    overallScore: number;
    summary: string;
    focusPoints: number[];
    scores: ReviewScore[];
    annotations: { ms: number; rubricPointId: number; body: string }[];
    prescribedDrillSlugs: string[];
  };
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  tier: Tier;
  onboardedAt: string | null;
  createdAt: string;
}

export interface Player {
  id: string;
  profileId: string;
  firstName: string;
  lastName: string | null;
  birthYear: number | null;
  level: PlayLevel;
  position: Position;
  shoots: 'left' | 'right';
  teamName: string | null;
}
