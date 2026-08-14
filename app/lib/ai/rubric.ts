/* ==========================================================================
   AI SHOT ANALYSIS RUBRIC

   Ten categories, scored only from what the footage actually shows.

   This is deliberately SEPARATE from the `RUBRIC` in lib/types.ts. That one is
   the coach-review rubric used by the human review editor, the drill database
   and the shot-mechanics course; changing it would alter coaching IP that is
   already wired into four screens. This rubric is what the vision model is
   asked to grade, and it can evolve independently of the coach's.
   ========================================================================== */

export type CategoryKey =
  | 'setup_stance'
  | 'weight_transfer'
  | 'lower_body'
  | 'hip_rotation'
  | 'shoulder_rotation'
  | 'stick_loading'
  | 'hand_position'
  | 'release_mechanics'
  | 'follow_through'
  | 'balance_stability';

export interface RubricCategory {
  key: CategoryKey;
  label: string;
  /** What the model should be looking for. Goes into the prompt verbatim. */
  looksLike: string;
  /** The most common fault, so the model has a concrete failure mode in mind. */
  commonFlaw: string;
  /**
   * Which camera angles can actually support a judgement here. Used to warn
   * the member up front, and to tell the model when to expect `null`.
   */
  bestAngles: ('side' | 'front' | 'rear')[];
}

export const SHOT_RUBRIC: RubricCategory[] = [
  {
    key: 'setup_stance',
    label: 'Setup / Stance',
    looksLike: 'Athletic base, feet roughly shoulder width, knees bent, chest up, eyes up.',
    commonFlaw: 'Upright and narrow, or bent at the waist instead of the knees.',
    bestAngles: ['side', 'front'],
  },
  {
    key: 'weight_transfer',
    label: 'Weight Transfer',
    looksLike: 'Pressure loads onto the back leg, then visibly drives through to the front side before release.',
    commonFlaw: 'Shooting off the back foot — weight never moves forward.',
    bestAngles: ['side'],
  },
  {
    key: 'lower_body',
    label: 'Lower-Body Mechanics',
    looksLike: 'Drive comes from the legs; front knee tracks over the foot rather than collapsing inward.',
    commonFlaw: 'All arms — the legs stay passive through the shot.',
    bestAngles: ['side', 'front'],
  },
  {
    key: 'hip_rotation',
    label: 'Hip Rotation',
    looksLike: 'Hips open toward the target and lead the hands into the release.',
    commonFlaw: 'Hips stay square and locked, so the shot is arms-only.',
    bestAngles: ['front', 'side'],
  },
  {
    key: 'shoulder_rotation',
    label: 'Shoulder Rotation',
    looksLike: 'Shoulders rotate in sequence after the hips, adding to the chain rather than starting it.',
    commonFlaw: 'Shoulders fire first, breaking the kinetic sequence.',
    bestAngles: ['front', 'rear'],
  },
  {
    key: 'stick_loading',
    label: 'Stick Loading',
    looksLike: 'Puck ahead of the blade with visible bend in the shaft as it loads against the ice.',
    commonFlaw: 'Puck too close to the body; no visible flex in the shaft.',
    bestAngles: ['side'],
  },
  {
    key: 'hand_position',
    label: 'Hand Position',
    looksLike: 'Bottom hand drives while the top hand pulls, with separation appropriate to the shot type.',
    commonFlaw: 'Hands too close together; passive bottom hand.',
    bestAngles: ['side', 'front'],
  },
  {
    key: 'release_mechanics',
    label: 'Release Mechanics',
    looksLike: 'Puck leaves toward the toe with the blade closing at the right instant; minimal drag beforehand.',
    commonFlaw: 'Releasing far too early, or dragging the puck so long the shot is telegraphed.',
    bestAngles: ['side'],
  },
  {
    key: 'follow_through',
    label: 'Follow Through',
    looksLike: 'Blade finishes toward the intended target with full extension.',
    commonFlaw: 'Cutting the finish short, or the blade rolling open at the end.',
    bestAngles: ['side', 'front'],
  },
  {
    key: 'balance_stability',
    label: 'Shot Balance / Stability',
    looksLike: 'Stable base held through the release; head steady rather than falling away from the shot.',
    commonFlaw: 'Falling away from the shot, leaking the power that was just loaded.',
    bestAngles: ['side', 'front'],
  },
];

export const RUBRIC_BY_CATEGORY: Record<CategoryKey, RubricCategory> = Object.fromEntries(
  SHOT_RUBRIC.map((c) => [c.key, c])
) as Record<CategoryKey, RubricCategory>;

export const CATEGORY_KEYS = SHOT_RUBRIC.map((c) => c.key);

/* --------------------------------------------------------------------------
   Result shapes.

   `score` is null whenever the footage cannot support a judgement. That is a
   first-class outcome, not an error — the whole point is that the system says
   "I cannot see this" instead of inventing a number.
-------------------------------------------------------------------------- */

export type CategoryStatus = 'scored' | 'insufficient_footage';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** How the model arrived at the judgement. Kept visible to the member. */
export type EvidenceBasis = 'observed' | 'inferred' | 'unable_to_evaluate';

export interface CategoryScore {
  key: CategoryKey;
  /** 1-10, or null when status is insufficient_footage. Never a guess. */
  score: number | null;
  status: CategoryStatus;
  confidence: ConfidenceLevel;
  basis: EvidenceBasis;
  /** What was actually visible. Must reference the footage, not generic advice. */
  observation: string;
  strength: string | null;
  improvement: string | null;
  /** Index into the frames array the judgement leans on most. */
  frameIndex?: number;
}

export interface AnalysisResult {
  /**
   * 0-100, normalised across only the categories that were gradeable, so a
   * clip supporting 6 of 10 is not unfairly penalised. Null when nothing at
   * all could be graded.
   */
  overallScore: number | null;
  categories: CategoryScore[];
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  summary: string;
  /** Overall confidence in the whole read, 0-1. */
  confidence: number;
  footageIssues: string[];
  gradedCount: number;
  model: string;
  analyzedAt: string;
}

/** Maps a 0-1 confidence to the coarse label shown in the UI. */
export function confidenceLabel(value: number): ConfidenceLevel {
  if (value >= 0.66) return 'high';
  if (value >= 0.35) return 'medium';
  return 'low';
}

/* ==========================================================================
   SCORE CALIBRATION

   THE PROBLEM THIS SOLVES
   The overall score used to be a straight linear map of the 1-10 category
   mean onto 0-100:  (mean / 10) * 100. That silently assumed a 1-10 coaching
   score means the same thing as a percentage. It does not.

   In coaching, 5/10 means "functional, real things to work on". As a
   percentage, 50 reads as a fail. A developing player with a connected,
   working shot scored a mean of 5.6 and was shown 56/100 — a number that says
   "your shot is broken" about a shot that is not.

   THE FIX
   An explicit anchor curve. Each 1-10 category level is given the 0-100 band
   the business actually means by it, and values in between are interpolated.
   This is a recalibration of MEANING, not a bonus: nothing is added, no floor
   is applied, and the full range stays in use. A genuinely poor shot still
   scores in the 40s and an elite one still has to earn the 90s.
   ========================================================================== */

/**
 * Category level (1-10) -> overall points (0-100).
 *
 * Read this as: "what does a player whose mechanics average THIS level
 * actually deserve to be told?" Derived directly from the published bands:
 *
 *   90-100  elite / exceptional        95+ needs a near-flawless read
 *   85-89   excellent
 *   80-84   strong
 *   75-79   good foundation, clear improvements
 *   70-74   developing but functional   <- the common youth case
 *   60-69   needs focused mechanical work
 *   <60     a genuinely significant mechanical problem
 *
 * The curve is intentionally compressed at the top (9 -> 10 buys 5 points)
 * and steep at the bottom (2 -> 3 buys 10). Elite is hard to reach; genuinely
 * broken mechanics are still clearly separated from merely imperfect ones.
 */
const SCORE_ANCHORS: readonly [level: number, points: number][] = [
  [1, 22], // fundamentally not working
  [2, 34],
  [3, 46], // significant mechanical issue
  [4, 57],
  [5, 66], // needs focused work
  [6, 74], // developing but functional
  [7, 80], // strong
  [8, 86], // excellent
  [9, 92],
  [10, 97], // elite — deliberately not 100
];

/** Piecewise-linear interpolation across the anchors above. */
export function levelToPoints(level: number): number {
  const clamped = Math.max(1, Math.min(10, level));
  for (let i = 0; i < SCORE_ANCHORS.length - 1; i++) {
    const [lo, loPts] = SCORE_ANCHORS[i];
    const [hi, hiPts] = SCORE_ANCHORS[i + 1];
    if (clamped >= lo && clamped <= hi) {
      const t = hi === lo ? 0 : (clamped - lo) / (hi - lo);
      return loPts + t * (hiPts - loPts);
    }
  }
  return SCORE_ANCHORS[SCORE_ANCHORS.length - 1][1];
}

/**
 * How much a category counts toward the overall score.
 *
 * A judgement the model was unsure about, or deduced rather than saw, should
 * not swing the headline number as hard as something plainly visible. This is
 * weighting, never point-adjustment: a low-confidence 4 is still a 4, it just
 * carries less of the average.
 */
const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  high: 1,
  medium: 0.7,
  low: 0.4,
};

const BASIS_WEIGHT: Record<EvidenceBasis, number> = {
  observed: 1,
  inferred: 0.75,
  // Contributes zero WEIGHT, not zero points — an unreadable category must
  // never drag the average down as though it were a bad score.
  unable_to_evaluate: 0,
};

export function categoryWeight(cat: CategoryScore): number {
  if (cat.score === null || cat.status === 'insufficient_footage') return 0;
  return CONFIDENCE_WEIGHT[cat.confidence] * BASIS_WEIGHT[cat.basis];
}

/**
 * The overall score: a confidence-weighted mean of the graded category levels,
 * mapped through the calibration curve.
 *
 * Only gradeable categories participate. Ungradeable ones are excluded from
 * both numerator and denominator, so "9 of 10 categories supported" costs the
 * player nothing.
 *
 * Returns null when nothing was gradeable — the honest answer, and the one
 * case where no number is shown at all.
 */
export function computeOverallScore(categories: CategoryScore[]): number | null {
  const graded = categories.filter((c) => c.score !== null && categoryWeight(c) > 0);
  if (graded.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const cat of graded) {
    const w = categoryWeight(cat);
    weightedSum += (cat.score as number) * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.round(levelToPoints(weightedSum / totalWeight));
}
