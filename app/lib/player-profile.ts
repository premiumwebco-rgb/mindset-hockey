/* ==========================================================================
   PLAYER PROFILE — SHARED SAVE LOGIC

   Onboarding and Edit Profile write the exact same row in the exact same
   table (`players`, migration 0001) with the exact same validation. Before
   this file, that logic lived only in app/api/onboarding/route.ts; rather
   than copy it into a second route for editing, both routes now call the
   functions below.

   Server-only. Never import this from a client component — it takes a
   session-scoped Supabase client and performs the actual write.
   ========================================================================== */

if (typeof window !== 'undefined') {
  throw new Error('lib/player-profile.ts is server-only and was imported from client code.');
}

import type { Session } from './session';
import { PILLARS, type Pillar, type PlayLevel, type Position } from './types';

export const PLAYER_LEVELS: PlayLevel[] = ['house', 'a', 'aa', 'aaa', 'prep', 'junior', 'college'];
export const PLAYER_POSITIONS: Position[] = ['forward', 'defense', 'goalie'];
export const PLAYER_SHOOTS: ('left' | 'right')[] = ['left', 'right'];
const PILLAR_KEYS = new Set(PILLARS.map((p) => p.key));

export interface PlayerProfileInput {
  firstName: string;
  birthYear: number | null;
  level: PlayLevel;
  position: Position;
  shoots: 'left' | 'right';
  stickFlex: number | null;
  focusPillars: Pillar[];
  trainingDaysGoal: number;
}

/**
 * Validates raw, untyped input from either a form POST (onboarding) or a
 * JSON PATCH body (profile edit) into the shape `players` expects.
 *
 * Never trusts a value from the client beyond "is it one of the allowed
 * values" — an unrecognised level/position/pillar falls back to a safe
 * default rather than being written as-is.
 */
export function validatePlayerInput(raw: {
  firstName?: unknown;
  birthYear?: unknown;
  level?: unknown;
  position?: unknown;
  shoots?: unknown;
  stickFlex?: unknown;
  focusPillars?: unknown;
  trainingDaysGoal?: unknown;
}): { ok: true; data: PlayerProfileInput } | { ok: false; error: string } {
  const firstName = String(raw.firstName ?? '').trim().slice(0, 100);
  if (!firstName) return { ok: false, error: 'Enter a first name.' };

  const birthRaw = raw.birthYear;
  const birthNum = birthRaw === null || birthRaw === undefined || birthRaw === '' ? null : Number(birthRaw);
  const birthYear =
    birthNum !== null && Number.isFinite(birthNum) && birthNum >= 1990 && birthNum <= 2030
      ? birthNum
      : null;

  const levelRaw = String(raw.level ?? 'a') as PlayLevel;
  const level = PLAYER_LEVELS.includes(levelRaw) ? levelRaw : 'a';

  const positionRaw = String(raw.position ?? 'forward') as Position;
  const position = PLAYER_POSITIONS.includes(positionRaw) ? positionRaw : 'forward';

  const shootsRaw = String(raw.shoots ?? 'right') as 'left' | 'right';
  const shoots = PLAYER_SHOOTS.includes(shootsRaw) ? shootsRaw : 'right';

  const flexRaw = raw.stickFlex;
  const flexNum = flexRaw === null || flexRaw === undefined || flexRaw === '' ? null : Number(flexRaw);
  const stickFlex = flexNum !== null && Number.isFinite(flexNum) && flexNum > 0 ? Math.round(flexNum) : null;

  const pillarsIn = Array.isArray(raw.focusPillars) ? raw.focusPillars : [];
  const focusPillars = [
    ...new Set(pillarsIn.map((v) => String(v)).filter((v) => PILLAR_KEYS.has(v as Pillar))),
  ] as Pillar[];

  const daysRaw = raw.trainingDaysGoal;
  const daysNum = daysRaw === null || daysRaw === undefined || daysRaw === '' ? 4 : Number(daysRaw);
  const trainingDaysGoal = Number.isFinite(daysNum) && daysNum >= 1 && daysNum <= 7 ? Math.round(daysNum) : 4;

  return {
    ok: true,
    data: { firstName, birthYear, level, position, shoots, stickFlex, focusPillars, trainingDaysGoal },
  };
}

/**
 * Writes the validated input to `players`, scoped to the caller's own
 * session client so "own players" RLS (0001: `profile_id = auth.uid()`) is
 * the actual authorization boundary — this function does not decide who may
 * write, Postgres does.
 *
 * One player row per member account, matched by profile_id: a second call
 * (onboarding revisited, or a profile edit) updates the same row rather than
 * creating a second one.
 *
 * Also stamps profiles.onboarded_at the first time a player row is created —
 * an existing, previously-unused column (0001) rather than a new flag, so it
 * stays the one place "has this member finished onboarding?" is answered.
 */
export async function savePlayerProfile(
  session: Session,
  supabase: Awaited<ReturnType<typeof import('./supabase/server').createServerClient>>,
  data: PlayerProfileInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .limit(1)
    .maybeSingle();

  const payload = {
    profile_id: session.userId,
    first_name: data.firstName,
    birth_year: data.birthYear,
    level: data.level,
    position: data.position,
    shoots: data.shoots,
    stick_flex: data.stickFlex,
    focus_pillars: data.focusPillars,
    training_days_goal: data.trainingDaysGoal,
  };

  const { error } = existing
    ? await supabase.from('players').update(payload).eq('id', existing.id)
    : await supabase.from('players').insert(payload);

  if (error) {
    console.error('[player-profile] save failed:', error.message);
    return { ok: false, error: 'Could not save. Check your membership is active and try again.' };
  }

  if (!existing) {
    // Best-effort — onboarded_at is a convenience marker, not the source of
    // truth (the players row itself is), so a failure here is not fatal.
    const { error: onboardError } = await supabase
      .from('profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', session.userId)
      .is('onboarded_at', null);
    if (onboardError) {
      console.error('[player-profile] onboarded_at stamp failed:', onboardError.message);
    }
  }

  return { ok: true };
}
