/* ==========================================================================
   STRUCTURED OUTPUT VALIDATION

   The model is asked for JSON. It cannot be trusted to comply, so nothing it
   returns reaches the database without passing through here.

   The governing rule: WHEN IN DOUBT, DOWNGRADE TO null.
   A malformed, out-of-range or unexplained score becomes
   `insufficient_footage` rather than being coerced into a plausible number.
   Inventing a score to make the report look complete is the one failure mode
   this file exists to prevent.
   ========================================================================== */

import {
  SHOT_RUBRIC,
  confidenceLabel,
  type AnalysisResult,
  type CategoryScore,
  type CategoryKey,
  type ConfidenceLevel,
  type EvidenceBasis,
} from './rubric';

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelOutputError';
  }
}

interface RawCategory {
  key?: unknown;
  score?: unknown;
  status?: unknown;
  confidence?: unknown;
  basis?: unknown;
  observation?: unknown;
  strength?: unknown;
  improvement?: unknown;
  frameIndex?: unknown;
}

interface RawOutput {
  categories?: unknown;
  strengths?: unknown;
  improvementAreas?: unknown;
  recommendations?: unknown;
  summary?: unknown;
  confidence?: unknown;
  footageIssues?: unknown;
}

/** Strips a markdown fence if the model added one, then parses the JSON body. */
export function parseModelJson(text: string): RawOutput {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new ModelOutputError('The model did not return JSON.');
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as RawOutput;
  } catch (err) {
    throw new ModelOutputError(`The model returned invalid JSON: ${(err as Error).message}`);
  }
}

function cleanString(value: unknown, maxLen = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
}

function cleanStringArray(value: unknown, maxItems: number, maxLen = 400): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => cleanString(v, maxLen))
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

function cleanConfidence(value: unknown): ConfidenceLevel {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  // Some models answer with a number despite being asked for a word.
  if (typeof value === 'number' && Number.isFinite(value)) return confidenceLabel(value);
  return 'low';
}

function cleanBasis(value: unknown): EvidenceBasis {
  if (value === 'observed' || value === 'inferred' || value === 'unable_to_evaluate') {
    return value;
  }
  return 'inferred';
}

/**
 * Normalises one category. A score survives only if it is a finite number in
 * 1-10, the model marked the category as scored, and it supplied an actual
 * observation to back it up. Anything else collapses to insufficient_footage.
 */
function normaliseCategory(key: CategoryKey, raw: RawCategory | undefined): CategoryScore {
  const observation = cleanString(raw?.observation);
  const declaredInsufficient =
    raw?.status === 'insufficient_footage' || raw?.basis === 'unable_to_evaluate';

  let score: number | null = null;
  if (
    !declaredInsufficient &&
    typeof raw?.score === 'number' &&
    Number.isFinite(raw.score) &&
    raw.score >= 1 &&
    raw.score <= 10 &&
    observation.length > 0
  ) {
    score = Math.round(raw.score);
  }

  const scored = score !== null;

  return {
    key,
    score,
    status: scored ? 'scored' : 'insufficient_footage',
    // An ungradeable category cannot carry high confidence, whatever the model said.
    confidence: scored ? cleanConfidence(raw?.confidence) : 'low',
    basis: scored ? cleanBasis(raw?.basis) : 'unable_to_evaluate',
    observation:
      observation ||
      'The supplied footage does not clearly show this. Nothing was scored for it.',
    strength: scored ? cleanString(raw?.strength) || null : null,
    improvement: cleanString(raw?.improvement) || null,
    frameIndex:
      typeof raw?.frameIndex === 'number' && Number.isFinite(raw.frameIndex)
        ? Math.max(0, Math.round(raw.frameIndex))
        : undefined,
  };
}

/**
 * Turns raw model output into a validated AnalysisResult.
 * Throws only when the response is structurally unusable — a response where
 * every category is ungradeable is a VALID result (and an honest one).
 */
export function validateAnalysis(raw: RawOutput, model: string): AnalysisResult {
  const rawCategories = Array.isArray(raw.categories) ? (raw.categories as RawCategory[]) : [];
  if (rawCategories.length === 0) {
    throw new ModelOutputError('The model returned no category scores.');
  }

  // Driven by OUR rubric, not the model's list — extra or renamed keys are
  // discarded and missing ones become insufficient_footage.
  const categories = SHOT_RUBRIC.map((cat) =>
    normaliseCategory(
      cat.key,
      rawCategories.find((c) => c.key === cat.key)
    )
  );

  const graded = categories.filter((c) => c.score !== null);
  const overallScore =
    graded.length === 0
      ? null
      : Math.round(
          (graded.reduce((sum, c) => sum + (c.score as number), 0) / (graded.length * 10)) * 100
        );

  let confidence = 0;
  if (typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)) {
    confidence = Math.max(0, Math.min(1, raw.confidence));
  }

  // Confidence cannot exceed the share of the rubric that was actually
  // gradeable. Half the categories unreadable means at most 0.5 confidence,
  // no matter how sure the model claims to be.
  const coverage = graded.length / SHOT_RUBRIC.length;
  confidence = Math.min(confidence, coverage);

  const footageIssues = cleanStringArray(raw.footageIssues, 8);
  if (graded.length < SHOT_RUBRIC.length && footageIssues.length === 0) {
    footageIssues.push(
      `${SHOT_RUBRIC.length - graded.length} of ${SHOT_RUBRIC.length} categories could not be graded from this footage.`
    );
  }

  return {
    overallScore,
    categories,
    strengths: cleanStringArray(raw.strengths, 6),
    improvementAreas: cleanStringArray(raw.improvementAreas, 6),
    recommendations: cleanStringArray(raw.recommendations, 8),
    summary: cleanString(raw.summary, 1200),
    confidence,
    footageIssues,
    gradedCount: graded.length,
    model,
    analyzedAt: new Date().toISOString(),
  };
}
