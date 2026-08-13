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
