/* ==========================================================================
   AI SHOT ANALYSIS — configuration

   Everything tunable lives here, read from env with sane defaults, so cost
   controls can be changed per-deployment without a code change.

   NOTE: none of these are NEXT_PUBLIC_. This module is imported only from
   server code (API routes and server components). API keys must never be
   bundled into client JavaScript.
   ========================================================================== */

/** Videos we will accept. MOV arrives as video/quicktime from iPhones. */
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export const ACCEPTED_VIDEO_EXTENSIONS = /\.(mp4|mov|webm)$/i;

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Largest upload accepted, in bytes. Default 200 MB. */
export const MAX_VIDEO_BYTES = intFromEnv('AI_MAX_VIDEO_MB', 200) * 1024 * 1024;

/** Frames sent to the vision model. More frames = more tokens = more cost. */
export const MAX_FRAMES = intFromEnv('AI_MAX_FRAMES', 12);

/** Per-frame ceiling after base64 decode, in bytes. */
export const MAX_FRAME_BYTES = intFromEnv('AI_MAX_FRAME_MB', 3) * 1024 * 1024;

/* --------------------------------------------------------------------------
   GLOBAL SAFETY LAYER

   Per-player weekly allowances (AI_ANALYSIS_LIMITS in lib/plans.ts) bound what
   any ONE member can spend. These bound what EVERYONE can spend together, and
   are the last line of defence against a surprise provider bill — a bug, a
   bulk signup, or an abuse pattern that stays inside every individual limit
   while still costing far more than expected.

   Deliberately env-driven so both can be changed on a live deployment without
   a code change or redeploy.
-------------------------------------------------------------------------- */

/**
 * KILL SWITCH. Set AI_ENABLED=false to stop all new analyses immediately.
 *
 * Uploads keep working and clips still route to a coach for manual review —
 * the product degrades rather than breaking, and nothing fabricates a score.
 * Anything other than an explicit "false"/"0" leaves AI enabled, so a typo
 * cannot silently disable the feature.
 */
export const AI_ENABLED = !['false', '0', 'off', 'no'].includes(
  (process.env.AI_ENABLED ?? 'true').trim().toLowerCase()
);

/**
 * COST OBSERVABILITY — NOT A QUOTA.
 *
 * There is deliberately NO global analysis-count ceiling. An earlier version
 * had one (`AI_GLOBAL_WEEKLY_MAX = 500`), which confused a ~$500/month
 * Anthropic BUDGET with a limit of 500 analyses. Those are different units and
 * the mistake would have throttled customers who were nowhere near the spend.
 * It has been removed outright rather than retuned.
 *
 * Two separate systems, and they must not be conflated:
 *
 *   CUSTOMER ENTITLEMENT   1 analysis = 1 entitlement
 *                          Standard 10/week, Premium 20/week, plus paid
 *                          $0.50 add-ons (analysis_purchases ledger)
 *                          -> AI_ANALYSIS_LIMITS in lib/plans.ts
 *
 *   PLATFORM COST          provider tokens -> estimated USD
 *                          -> recorded per attempt in `ai_usage`
 *                          -> observed by the operator, enforced by hand
 *                             via the AI_ENABLED kill switch
 *
 * WHY NO AUTOMATIC SPEND CUTOFF
 * A trustworthy cutoff needs a trustworthy cost figure, and a cost figure
 * needs per-model token prices that change and that this codebase cannot
 * verify at runtime. Guessing them would mean either cutting members off over
 * a number that was invented, or failing to cut off when it mattered. So the
 * rates below are OPTIONAL and operator-supplied: set them from your own
 * Anthropic pricing page and estimated cost is recorded; leave them unset and
 * only raw token counts are recorded. Nothing is ever fabricated, and no
 * automatic cutoff is derived from an unverified price.
 */

function floatFromEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * USD per MILLION tokens, taken from your provider's pricing page.
 * Both unset (the default) => estimated_cost_usd stays null and only token
 * counts are stored. That is an honest "unknown", not a zero.
 */
export const AI_COST_PER_MTOK_INPUT = floatFromEnv('AI_COST_PER_MTOK_INPUT');
export const AI_COST_PER_MTOK_OUTPUT = floatFromEnv('AI_COST_PER_MTOK_OUTPUT');

/** Reference only — displayed to the operator, never enforced in code. */
export const AI_MONTHLY_BUDGET_USD = floatFromEnv('AI_MONTHLY_BUDGET_USD');

/**
 * Estimated USD for one provider call, or null when no rate is configured.
 * Never guesses a price.
 */
export function estimateCostUsd(
  inputTokens: number | null,
  outputTokens: number | null
): number | null {
  if (AI_COST_PER_MTOK_INPUT === null && AI_COST_PER_MTOK_OUTPUT === null) return null;
  if (inputTokens === null && outputTokens === null) return null;
  const inCost = ((inputTokens ?? 0) / 1_000_000) * (AI_COST_PER_MTOK_INPUT ?? 0);
  const outCost = ((outputTokens ?? 0) / 1_000_000) * (AI_COST_PER_MTOK_OUTPUT ?? 0);
  return Number((inCost + outCost).toFixed(6));
}

/** Wall-clock ceiling for one model call. */
export const ANALYSIS_TIMEOUT_MS = intFromEnv('AI_TIMEOUT_MS', 90_000);

export const VIDEO_BUCKET = 'member-videos';
export const FRAME_BUCKET = 'analysis-frames';

/** How long a playback URL stays valid, in seconds. Default 1 hour. */
export const SIGNED_URL_TTL = intFromEnv('AI_SIGNED_URL_TTL', 3600);

export type ShotType = 'wrist' | 'snap' | 'slap' | 'backhand' | 'one_timer';
export type CameraAngle = 'side' | 'front' | 'rear';

export const SHOT_TYPES: { value: ShotType; label: string }[] = [
  { value: 'wrist', label: 'Wrist shot' },
  { value: 'snap', label: 'Snap shot' },
  { value: 'slap', label: 'Slap shot' },
  { value: 'backhand', label: 'Backhand' },
  { value: 'one_timer', label: 'One-timer' },
];

export const CAMERA_ANGLES: { value: CameraAngle; label: string; hint: string }[] = [
  { value: 'side', label: 'Side on', hint: 'Best angle. Shows load, transfer and release.' },
  { value: 'front', label: 'Front on', hint: 'Good for hips, shoulders and hand separation.' },
  { value: 'rear', label: 'From behind', hint: 'Limited — shoulder rotation only.' },
];

export function isShotType(value: unknown): value is ShotType {
  return SHOT_TYPES.some((s) => s.value === value);
}

export function isCameraAngle(value: unknown): value is CameraAngle {
  return CAMERA_ANGLES.some((a) => a.value === value);
}
