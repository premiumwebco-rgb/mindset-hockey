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

/**
 * Rate limiting — the previous implementation had none, and every call costs
 * money at the vision API. Set to 0 to disable a given limit entirely.
 */
export const ANALYSES_PER_DAY = intFromEnv('AI_ANALYSES_PER_DAY', 5);
export const ANALYSES_PER_MONTH = intFromEnv('AI_ANALYSES_PER_MONTH', 40);

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
