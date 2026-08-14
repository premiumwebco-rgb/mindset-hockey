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
  computeOverallScore,
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

/**
 * The response stopped mid-structure — the JSON is not malformed so much as
 * unfinished. Kept separate from ModelOutputError because it is the one
 * failure a stricter, shorter retry genuinely tends to fix, and because it
 * means "we ran out of room", not "the model cannot follow instructions".
 */
export class TruncatedOutputError extends ModelOutputError {
  constructor(message: string) {
    super(message);
    this.name = 'TruncatedOutputError';
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

/**
 * Locates the first COMPLETE top-level JSON object in a blob of model text.
 *
 * The previous implementation took `indexOf('{')` … `lastIndexOf('}')`. On a
 * truncated response that silently grabs everything up to the last inner
 * closing brace — a prefix of an object — and hands JSON.parse a fragment.
 * That is what produced:
 *
 *   "Expected ',' or ']' after array element … at position 4509"
 *
 * which reads like malformed JSON but actually means the response was cut off
 * mid-array. Brace counting must also respect string literals and escapes, or
 * a `}` inside an observation string ends the object early.
 *
 * Returns null when no balanced object is present, so the caller can tell
 * "truncated" apart from "no JSON at all".
 */
function extractBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Ran to the end while still nested: the response stopped mid-object.
  return null;
}

/**
 * Extracts and parses the JSON object from a raw model response.
 *
 * Handles, in order: a bare object, a ```json fenced block, a fenced block
 * with no language tag, and an object embedded in surrounding prose. It does
 * NOT attempt to repair broken JSON — no quote-balancing, no bracket-patching,
 * no trailing-comma stripping. A response that cannot be parsed as written is
 * rejected, because a "repaired" analysis is a fabricated one.
 */
export function parseModelJson(text: string): RawOutput {
  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    throw new ModelOutputError('The model returned an empty response.');
  }

  // Prefer the contents of a fenced block when one is present; models often
  // wrap JSON in ```json even when told not to.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = fenced ? [fenced[1], trimmed] : [trimmed];

  for (const candidate of candidates) {
    const objectText = extractBalancedObject(candidate);
    if (!objectText) continue;
    try {
      const parsed = JSON.parse(objectText);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ModelOutputError('The model returned JSON that was not an object.');
      }
      return parsed as RawOutput;
    } catch (err) {
      if (err instanceof ModelOutputError) throw err;
      throw new ModelOutputError(
        `The model returned JSON that could not be parsed: ${(err as Error).message}`
      );
    }
  }

  // A '{' with no matching '}' is an unfinished response, not a broken one.
  if (trimmed.includes('{')) {
    throw new TruncatedOutputError(
      'The model response stopped before the JSON object was complete.'
    );
  }
  throw new ModelOutputError('The model did not return JSON.');
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

  // Confidence-weighted, then mapped through the calibration curve in
  // rubric.ts. Previously this was (mean / 10) * 100, which treated a 1-10
  // coaching score as a percentage and made a functional developing shot read
  // as a failing grade. Ungradeable categories are excluded from the average
  // entirely rather than counting as zero.
  const overallScore = computeOverallScore(categories);

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
