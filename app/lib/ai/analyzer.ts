import { SHOT_RUBRIC, type AnalysisResult } from './rubric';
import { parseModelJson, validateAnalysis, ModelOutputError } from './schema';
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

5. BE HONEST, NOT ENCOURAGING. A family is paying for this. If the mechanics are
   poor, say so plainly and kindly. Do not pad the report with praise.

6. CONFIDENCE. Per category use "high", "medium" or "low". Overall confidence is
   0.0-1.0 and should reflect footage quality honestly — distant rink-camera
   footage should be below 0.4.

7. The camera angle limits you. A front-on clip cannot support a weight-transfer
   judgement; a side-on clip cannot support shoulder rotation. Respect that and
   return null rather than reaching.

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

async function runAnthropic(input: AnalyzerInput): Promise<AnalysisResult> {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

  const content: unknown[] = input.frames.map((f) => ({
    type: 'image',
    source: { type: 'base64', media_type: f.mediaType, data: f.base64 },
  }));
  content.push({ type: 'text', text: buildPrompt(input) });

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = json.content.find((c) => c.type === 'text')?.text ?? '';
  return validateAnalysis(parseModelJson(text), model);
}

async function runOpenAI(input: AnalyzerInput): Promise<AnalysisResult> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';

  const content: unknown[] = [
    { type: 'text', text: buildPrompt(input) },
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
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = json.choices[0]?.message?.content ?? '';
  return validateAnalysis(parseModelJson(text), model);
}

/**
 * Runs one analysis.
 *
 * Throws AnalyzerNotConfiguredError when no provider key is present. Callers
 * MUST handle that by routing the clip to human review — never by generating
 * placeholder scores.
 */
export async function analyzeShot(input: AnalyzerInput): Promise<AnalysisResult> {
  if (!input.frames.length) throw new Error('No frames supplied.');
  if (process.env.ANTHROPIC_API_KEY) return runAnthropic(input);
  if (process.env.OPENAI_API_KEY) return runOpenAI(input);
  throw new AnalyzerNotConfiguredError();
}

export { ModelOutputError };
