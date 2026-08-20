import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { PILLARS } from '@/lib/types';

export const runtime = 'nodejs';

const LEVELS = ['house', 'a', 'aa', 'aaa', 'prep', 'junior', 'college'];
const POSITIONS = ['forward', 'defense', 'goalie'];
const SHOOTS = ['left', 'right'];
const PILLAR_KEYS = new Set(PILLARS.map((p) => p.key));

/**
 * Persists the onboarding form to `players` (migration 0001) — previously
 * `<form action="/dashboard">` submitted nowhere: every field the member
 * filled in (name, birth year, level, position, shoots, stick flex, focus
 * pillars, training days) was discarded and the browser just navigated to
 * /dashboard as if a plain link had been clicked.
 *
 * A plain <form> POST (not fetch/JSON), so the redirects below use
 * NextResponse.redirect with an explicit 303 — that's what makes the
 * browser's follow-up request a GET instead of re-POSTing the form data to
 * whichever page it lands on.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  const url = new URL(req.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin), 303);

  if (DEMO_MODE) {
    return to('/dashboard');
  }

  const form = await req.formData();

  const firstName = String(form.get('first') ?? '').trim().slice(0, 100);
  if (!firstName) {
    return to('/onboarding?error=missing_first_name');
  }

  const birthRaw = form.get('birth');
  const birthYear = birthRaw ? Number(birthRaw) : null;
  const validBirthYear =
    birthYear !== null && Number.isFinite(birthYear) && birthYear >= 1990 && birthYear <= 2030
      ? birthYear
      : null;

  const levelRaw = String(form.get('level') ?? 'a');
  const level = LEVELS.includes(levelRaw) ? levelRaw : 'a';

  const positionRaw = String(form.get('position') ?? 'forward');
  const position = POSITIONS.includes(positionRaw) ? positionRaw : 'forward';

  const shootsRaw = String(form.get('shoots') ?? 'right');
  const shoots = SHOOTS.includes(shootsRaw) ? shootsRaw : 'right';

  const flexRaw = form.get('flex');
  const flex = flexRaw ? Number(flexRaw) : null;
  const stickFlex = flex !== null && Number.isFinite(flex) && flex > 0 ? Math.round(flex) : null;

  const pillars = form
    .getAll('pillars')
    .map((v) => String(v))
    .filter((v) => PILLAR_KEYS.has(v as never));

  const daysRaw = form.get('days');
  const days = daysRaw ? Number(daysRaw) : 4;
  const trainingDaysGoal = Number.isFinite(days) && days >= 1 && days <= 7 ? Math.round(days) : 4;

  const supabase = await createServerClient();

  // One player row per member account for now — "own players" RLS (0001)
  // scopes every operation here to profile_id = auth.uid() regardless.
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .limit(1)
    .maybeSingle();

  const payload = {
    profile_id: session.userId,
    first_name: firstName,
    birth_year: validBirthYear,
    level,
    position,
    shoots,
    stick_flex: stickFlex,
    focus_pillars: pillars,
    training_days_goal: trainingDaysGoal,
  };

  const { error } = existing
    ? await supabase.from('players').update(payload).eq('id', existing.id)
    : await supabase.from('players').insert(payload);

  if (error) {
    console.error('[onboarding] save failed:', error.message);
    return to('/onboarding?error=save_failed');
  }

  return to('/dashboard');
}
