import { SHOT_RUBRIC, type AnalysisResult } from './rubric';
import {
  parseModelJson,
  validateAnalysis,
  ModelOutputError,
  TruncatedOutputError,
} from './schema';
import { ANALYSIS_TIMEOUT_MS, type CameraAngle, type ShotType } from './config';

/* ==========================================================================
   VISION MODEL ADAPTER  —  SERVER ONLY

   The guard below is load-bearing. This module reads ANTHROPIC_API_KEY /
   OPENAI_API_KEY, so it must never end up in a client bundle. If a client
   component ever imports it, the throw fires immediately in the browser and
   the mistake is impossible to miss.

   (The `server-only` npm package would turn this into a build-time error
   instead. It is not currently a dependency; see SETUP.md if you want to add
   it as belt-and-braces.)

   WHAT THIS IS
   A trained eye on still frames — what a coach does stepping through film,
   at speed. It reliably catches gross mechanical faults: shooting off the back
   foot, no shaft load, hands together, a follow-through cut short.

   WHAT THIS IS NOT
   It is not a biomechanics lab. It cannot measure joint angles, puck velocity
   or force. It sees pixels. Every result therefore carries a confidence figure
   and a per-category basis (observed / inferred / unable to evaluate), and the
   UI shows both.

   NO KEY, NO SCORES
   With no provider configured this throws, and the caller routes the clip to a
   human coach. It never invents numbers to fill the page.
   ========================================================================== */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/ai/analyzer.ts was imported from client code. It reads AI provider ' +
      'secrets and must only ever run on the server.'
  );
}

export interface AnalyzerInput {
  /** Base64 JPEG frames (no data: prefix), in time order. */
  frames: { base64: string; mediaType: string; timestampMs: number }[];
  shotType: ShotType;
  angle: CameraAngle;
  playerNotes?: string;
  playerLevel?: string;
}

/**
 * What the PROVIDER reported about one call. Never estimated or inferred —
 * absent fields stay null so cost reporting can say "unknown" rather than
 * quietly reading as zero spend.
 */
export interface AttemptUsage {
  provider: 'anthropic' | 'openai';
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Which call this was: the first attempt, or the format-correction retry. */
  kind: 'primary' | 'repair';
}

/** Collects usage across the attempts made inside one customer entitlement. */
const usageSink: AttemptUsage[] = [];

function recordAttemptUsage(u: AttemptUsage): void {
  usageSink.push(u);
}

function drainAttemptUsage(): AttemptUsage[] {
  return usageSink.splice(0, usageSink.length);
}

function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export class AnalyzerNotConfiguredError extends Error {
  constructor() {
    super(
      'No AI provider configured. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) to enable automated analysis.'
    );
    this.name = 'AnalyzerNotConfiguredError';
  }
}

export function analyzerConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export function configuredModel(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_MODEL ?? 'gpt-4o';
  return null;
}

/* -------------------------------------------------------------------------- */

/**
 * Output budget.
 *
 * Ten categories, each with an observation, a strength and an improvement,
 * plus four top-level arrays and a summary, does not fit in 4000 tokens. When
 * it overflows the response stops mid-array and the old parser reported it as
 * "invalid JSON" — the bug this file was changed to fix.
 *
 * Raising this alone would NOT be a fix: it just moves the cliff. The real
 * guard is the tool-use schema below (which constrains the shape), the
 * stop_reason check (which names truncation instead of mis-reporting it as
 * malformed), and the strict single retry. This value simply stops the common
 * case hitting the ceiling in the first place.
 */
const MAX_OUTPUT_TOKENS = 8000;

/** Field limits mirrored from schema.ts so the model is asked for what we keep. */
const CATEGORY_KEYS = SHOT_RUBRIC.map((c) => c.key);

/**
 * JSON Schema handed to Anthropic as a tool definition.
 *
 * This is Anthropic's structured-output mechanism on the Messages API: declare
 * a tool whose `input_schema` is the shape you want and force it with
 * `tool_choice`. The model then returns a `tool_use` block whose `input` is
 * already a parsed JSON object conforming to the schema — there is no text to
 * fence-strip or brace-match in the happy path, which is what makes this a
 * structural fix rather than better error handling.
 *
 * It does not replace validateAnalysis(). The schema constrains shape; our
 * validator still enforces meaning (a score needs a real observation behind
 * it, confidence cannot exceed coverage, unknown keys are discarded).
 */
const ANALYSIS_TOOL = {
  name: 'record_shot_analysis',
  description:
    'Record the mechanics analysis of the supplied shot frames. Use null scores for anything the footage cannot support.',
  input_schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        description: 'One entry per rubric category, all ten, in any order.',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', enum: CATEGORY_KEYS },
            score: {
              type: ['integer', 'null'],
              minimum: 1,
              maximum: 10,
              description: 'null when the footage cannot support a judgement.',
            },
            status: { type: 'string', enum: ['scored', 'insufficient_footage'] },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            basis: { type: 'string', enum: ['observed', 'inferred', 'unable_to_evaluate'] },
            observation: { type: 'string' },
            strength: { type: ['string', 'null'] },
            improvement: { type: ['string', 'null'] },
            frameIndex: { type: ['integer', 'null'], minimum: 0 },
          },
          required: ['key', 'score', 'status', 'confidence', 'basis', 'observation'],
        },
      },
      strengths: { type: 'array', items: { type: 'string' } },
      improvementAreas: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      footageIssues: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'categories',
      'strengths',
      'improvementAreas',
      'recommendations',
      'summary',
      'confidence',
      'footageIssues',
    ],
  },
} as const;

/**
 * Appended on the second and final attempt after a format failure.
 * Tightens the output budget rather than the analysis quality — the usual
 * cause is verbosity, not misunderstanding.
 */
const CORRECTION_INSTRUCTION = `
IMPORTANT — YOUR PREVIOUS RESPONSE COULD NOT BE READ.
It was not valid, complete, schema-conforming output.

This is your final attempt. Be considerably more concise:
- Keep every "observation" under 160 characters.
- Keep "strength" and "improvement" under 120 characters each.
- At most 3 items in each of strengths, improvementAreas, recommendations.
- Keep "summary" to two sentences.
- Still include all ten categories, and still return null for anything the
  footage does not support. Brevity must not turn a null into a guess.`;

function buildPrompt(input: AnalyzerInput): string {
  const rubricText = SHOT_RUBRIC.map(
    (c, i) =>
      `${i + 1}. key="${c.key}" — ${c.label}\n` +
      `   Good looks like: ${c.looksLike}\n` +
      `   Common flaw: ${c.commonFlaw}\n` +
      `   Best judged from: ${c.bestAngles.join(' or ')} angle`
  ).join('\n');

  return `You are a hockey shot-mechanics analysis assistant reviewing still frames from one player's shot.

You are NOT a certified biomechanist and you must not present yourself as one.
You are looking at ordinary video frames, not laboratory motion capture.

FOOTAGE
${input.frames.length} frames in time order, spanning setup through follow-through.
Shot type: ${input.shotType}. Camera angle: ${input.angle}.
${input.playerLevel ? `Player level: ${input.playerLevel}.` : ''}
${input.playerNotes ? `Player's own note: ${input.playerNotes}` : ''}

RUBRIC — ten categories
${rubricText}

SCORING SCALE — read this before assigning any number.

You are grading a DEVELOPING PLAYER against what is appropriate for their
level, not against an NHL benchmark. The score describes their current level
of execution. Most players you see will be somewhere between 6 and 8.

  10  Elite. Nothing to correct at this level of play.
  9   Excellent. A minor refinement at most.
  8   Strong. Works well; one clear thing to sharpen.
  7   Good foundation. Functional and repeatable, with an identifiable
      improvement. THIS IS A GOOD SCORE — use it freely.
  6   Developing but functional. The mechanic works; it is not yet consistent
      or efficient.
  5   Mixed. Genuinely inconsistent, or works sometimes and breaks others.
  4   A real mechanical problem that measurably limits the shot.
  3   Significant breakdown in this mechanic.
  1-2 The mechanic is fundamentally not happening.

CALIBRATION RULES:

A. 4-6 IS NOT THE DEFAULT. Do not use 5 or 6 to mean "not elite". A 5 means
   the mechanic is genuinely mixed or problematic. If a movement is imperfect
   but still produces a connected, working shot, that is a 7 — not a 5.

B. IMPERFECT BUT FUNCTIONAL SCORES 7. Before scoring below 7, ask: "is this
   actually limiting the shot, or is it just not textbook?" Only the former
   scores low. Some forward bend at the waist, with a connected shot and a
   full follow-through, is a 7 — not a 4.

C. DISTINGUISH FOUR DIFFERENT THINGS:
     1. A true mechanical error that substantially limits the shot   -> 3-5
     2. A technically imperfect movement that still works            -> 6-7
     3. A normal developmental opportunity for this age/level        -> 7-8
     4. Something the footage cannot establish                       -> null
   Never score (2), (3) or (4) as though it were (1).

D. DO NOT PENALISE THE SAME FAULT REPEATEDLY. Decide the ONE primary
   mechanical issue. Reflect it fully in the category it belongs to, and only
   lightly where it has genuine knock-on effects. If a player comes off the
   ice at release, that is primarily a balance/stability observation — it must
   not also drop weight transfer, lower body, and follow-through by the same
   amount for the same underlying reason. Three categories at 4 for one fault
   is a scoring error.

E. COMING OFF THE ICE IS NOT AUTOMATICALLY A FAULT. Players leave the ice on
   powerful shots. Score it down only if the footage clearly shows it causing
   instability or disrupting the shot.

F. USE THE WHOLE SCALE. Do not cluster everything at 7. Genuinely weak
   mechanics must still score low, and genuinely excellent mechanics must
   still earn 9-10. A report where every category is 7 is not honest.

RULES — these are absolute:

1. NEVER GUESS. Score a category only when the frames genuinely show it. If the
   angle is wrong, the player is too far away, the frame rate misses the
   release, or the body part is out of shot, return:
     "score": null, "status": "insufficient_footage", "basis": "unable_to_evaluate"
   Returning null is a correct, expected answer. A report with four honest
   scores is worth more than ten invented ones.

2. NO FABRICATED MEASUREMENTS. Never state angles, percentages, velocities or
   forces. You cannot measure them from this footage. Write "the back foot is
   still visibly loaded at frame 4", never "weight transfer is 73% complete".

3. DISTINGUISH WHAT YOU KNOW FROM WHAT YOU INFER. For each category set "basis":
     "observed"  — directly visible in the frames
     "inferred"  — reasonably deduced from what is visible, but not seen outright
     "unable_to_evaluate" — cannot be judged (score must then be null)

4. CITE THE FOOTAGE. Every observation must reference something concretely
   visible, ideally with a frame index. Generic coaching advice is not an
   observation.

5. WRITE LIKE A GOOD COACH, NOT A REPORT CARD. A family is paying for this and
   a young player will read it. Be straight about what needs work — never hide
   a real problem — but always pair it with context and a path forward.

   Lead with what is working, then name the biggest opportunity:
     GOOD: "There's a connected swing and a full follow-through here. The
            biggest opportunity is staying grounded through the finish."
     BAD:  "Balance breaks down and the player runs out of the shot."

     GOOD: "Try holding your knee bend while keeping your chest a little
            higher."
     BAD:  "The player is bent at the waist rather than the knees."

   Honest does not mean harsh. Do not invent praise for something that is not
   there, and do not soften a genuine mechanical problem into vagueness.

6. MATCH YOUR LANGUAGE TO YOUR EVIDENCE. Where the footage clearly shows
   something, say it directly. Where it does not, hedge honestly — "appears",
   "suggests", "may indicate", "one opportunity is", "worth exploring". Never
   state a definite biomechanical conclusion from an angle that cannot support
   it, especially a rear view where the relevant body parts are obscured.

7. CONFIDENCE. Per category use "high", "medium" or "low". Overall confidence is
   0.0-1.0 and should reflect footage quality honestly — distant rink-camera
   footage should be below 0.4. Confidence is used to weight the final score, so
   report it accurately rather than defensively.

8. The camera angle limits you. A front-on clip cannot support a weight-transfer
   judgement; a side-on clip cannot support shoulder rotation. Respect that and
   return null rather than reaching.

9. THE SUMMARY IS THE PART THEY WILL ACTUALLY READ. Structure it in three
   beats, in this order, in plain language a 14-year-old and their parent both
   understand:
     1. What they are doing well.
     2. The single biggest opportunity.
     3. Exactly what to practise next.
   Do not make the score the emotional centre of it. Example of the right
   shape: "You have a solid foundation with a connected swing, visible shoulder
   rotation and a full follow-through. The biggest opportunity is staying
   grounded through the finish. Work on holding your finish for two seconds
   after each shot, then gradually build the speed back up."

Return ONLY valid JSON, no markdown fence, in exactly this shape:
{
  "categories": [
    {
      "key": "setup_stance",
      "score": 7,
      "status": "scored",
      "confidence": "high",
      "basis": "observed",
      "observation": "Knees are bent with a shoulder-width base through frames 1-3.",
      "strength": "Stable athletic base before the load.",
      "improvement": "Chest drops slightly at frame 3; keep the eyes up.",
      "frameIndex": 2
    }
  ],
  "strengths": ["..."],
  "improvementAreas": ["..."],
  "recommendations": ["specific things to work on this week"],
  "summary": "2-3 sentences a 14-year-old and their parent would both understand",
  "confidence": 0.0,
  "footageIssues": ["what about this footage limited the analysis"]
}

Include all ten categories in the array, using null scores where you cannot judge.`;
}

/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `The vision model did not respond within ${Math.round(ANALYSIS_TIMEOUT_MS / 1000)}s.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Server-side only. Truncated so a huge body cannot flood the logs. */
function logRawResponse(provider: string, model: string, payload: unknown): void {
  // Never includes credentials: only the response body is logged, and the
  // request headers (which carry the key) are never touched here.
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  console.error(
    `[ai] ${provider}/${model} unusable response (first 2000 chars):\n${(text ?? '').slice(0, 2000)}`
  );
}

interface AnthropicResponse {
  content: { type: string; text?: string; name?: string; input?: unknown }[];
  stop_reason?: string;
  /** Provider-reported token counts. Authoritative — we never estimate these. */
  usage?: { input_tokens?: number; output_tokens?: number };
}

async function runAnthropic(input: AnalyzerInput, correction = false): Promise<AnalysisResult> {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

  const content: unknown[] = input.frames.map((f) => ({
    type: 'image',
    source: { type: 'base64', media_type: f.mediaType, data: f.base64 },
  }));
  content.push({
    type: 'text',
    text: buildPrompt(input) + (correction ? CORRECTION_INSTRUCTION : ''),
  });

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      // Structured output: force the model through the schema above instead of
      // hoping a prompt that says "return JSON" is obeyed.
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: ANALYSIS_TOOL.name },
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    // Body may contain the provider's error detail but never our key.
    throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const json = (await res.json()) as AnthropicResponse;

  // Record what the provider says this call cost in tokens, before any
  // branch below can throw. A failed or truncated call still spent tokens and
  // must still appear in cost accounting.
  recordAttemptUsage({
    provider: 'anthropic',
    model,
    inputTokens: tokenCount(json.usage?.input_tokens),
    outputTokens: tokenCount(json.usage?.output_tokens),
    kind: correction ? 'repair' : 'primary',
  });

  // Truncation is reported by the API — name it, rather than letting a
  // half-written object surface later as a confusing JSON parser error.
  if (json.stop_reason === 'max_tokens') {
    logRawResponse('anthropic', model, json);
    throw new TruncatedOutputError(
      'The model ran out of output space before finishing the analysis.'
    );
  }

  // Happy path: the tool block's `input` is already a parsed object matching
  // the schema. No fences, no prose, nothing to brace-match.
  const toolUse = json.content?.find(
    (c) => c.type === 'tool_use' && c.name === ANALYSIS_TOOL.name
  );
  if (toolUse?.input && typeof toolUse.input === 'object') {
    return validateAnalysis(toolUse.input as Parameters<typeof validateAnalysis>[0], model);
  }

  // Fallback: some model/version combinations answer in prose despite
  // tool_choice. Parse defensively rather than failing outright.
  const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
  if (!text.trim()) {
    logRawResponse('anthropic', model, json);
    throw new ModelOutputError('The model returned neither a tool result nor any text.');
  }

  try {
    return validateAnalysis(parseModelJson(text), model);
  } catch (err) {
    logRawResponse('anthropic', model, text);
    throw err;
  }
}

async function runOpenAI(input: AnalyzerInput, correction = false): Promise<AnalysisResult> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';

  const content: unknown[] = [
    { type: 'text', text: buildPrompt(input) + (correction ? CORRECTION_INSTRUCTION : '') },
    ...input.frames.map((f) => ({
      type: 'image_url',
      image_url: { url: `data:${f.mediaType};base64,${f.base64}` },
    })),
  ];

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  recordAttemptUsage({
    provider: 'openai',
    model,
    inputTokens: tokenCount(json.usage?.prompt_tokens),
    outputTokens: tokenCount(json.usage?.completion_tokens),
    kind: correction ? 'repair' : 'primary',
  });

  // Same truncation guard as the Anthropic path.
  if (json.choices?.[0]?.finish_reason === 'length') {
    logRawResponse('openai', model, json.choices[0]?.message?.content ?? '');
    throw new TruncatedOutputError(
      'The model ran out of output space before finishing the analysis.'
    );
  }

  const text = json.choices[0]?.message?.content ?? '';
  try {
    return validateAnalysis(parseModelJson(text), model);
  } catch (err) {
    logRawResponse('openai', model, text);
    throw err;
  }
}

/**
 * Runs one analysis.
 *
 * Throws AnalyzerNotConfiguredError when no provider key is present. Callers
 * MUST handle that by routing the clip to human review — never by generating
 * placeholder scores.
 */
export async function analyzeShot(
  input: AnalyzerInput,
  correction = false
): Promise<AnalysisResult> {
  if (!input.frames.length) throw new Error('No frames supplied.');
  if (process.env.ANTHROPIC_API_KEY) return runAnthropic(input, correction);
  if (process.env.OPENAI_API_KEY) return runOpenAI(input, correction);
  throw new AnalyzerNotConfiguredError();
}

/**
 * One analysis, with exactly ONE corrective retry on a format failure.
 *
 * A response that cannot be read is usually a formatting or length problem
 * rather than a judgement problem, and re-asking with a tighter budget fixes
 * it. Bounded deliberately at two attempts total:
 *   - each attempt costs a real model call against a paying member's quota
 *   - a model that fails the schema twice will not pass on the fifth try
 *   - an unbounded loop against a paid API is how you get a surprise bill
 *
 * ONLY format failures are retried. A network error, an API error, a timeout
 * or a missing key all propagate immediately — retrying those would just burn
 * another call.
 *
 * Retries the model call only. It writes nothing, records no usage and touches
 * no entitlement, so a second attempt cannot duplicate any database state.
 */
export async function analyzeShotWithRepair(
  input: AnalyzerInput
): Promise<{
  result: AnalysisResult;
  attempts: number;
  repaired: boolean;
  /** Every provider call made inside this ONE customer entitlement. */
  usage: AttemptUsage[];
}> {
  drainAttemptUsage(); // discard anything left by a previous run

  try {
    const result = await analyzeShot(input);
    return { result, attempts: 1, repaired: false, usage: drainAttemptUsage() };
  } catch (err) {
    if (!(err instanceof ModelOutputError)) {
      // Still surface whatever the failed call cost.
      lastFailedUsage = drainAttemptUsage();
      throw err;
    }

    const kind = err instanceof TruncatedOutputError ? 'truncated' : 'unreadable';
    console.warn(`[ai] first attempt ${kind} (${err.message}) — retrying once, stricter.`);

    try {
      // Same archived frames, same rubric, tighter output instruction.
      const result = await analyzeShot(input, true);
      // Usage covers BOTH attempts: two provider calls, one entitlement.
      return { result, attempts: 2, repaired: true, usage: drainAttemptUsage() };
    } catch (retryErr) {
      lastFailedUsage = drainAttemptUsage();
      throw retryErr;
    }
  }
}

/**
 * Token usage from the most recent FAILED analysis.
 *
 * A failed call still costs money, so the caller records it for cost
 * accounting even though the analysis produced nothing.
 */
let lastFailedUsage: AttemptUsage[] = [];

export function takeFailedUsage(): AttemptUsage[] {
  const u = lastFailedUsage;
  lastFailedUsage = [];
  return u;
}

export { ModelOutputError, TruncatedOutputError };
