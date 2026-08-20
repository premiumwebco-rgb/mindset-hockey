import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { validatePlayerInput, savePlayerProfile } from '@/lib/player-profile';

export const runtime = 'nodejs';

/**
 * Persists the onboarding form to `players` (migration 0001) — previously
 * `<form action="/dashboard">` submitted nowhere: every field the member
 * filled in (name, birth year, level, position, shoots, stick flex, focus
 * pillars, training days) was discarded and the browser just navigated to
 * /dashboard as if a plain link had been clicked.
 *
 * Validation and the actual write live in lib/player-profile.ts, shared with
 * PATCH /api/profile — onboarding and editing the profile later write the
 * same row the same way, so there is exactly one place that logic exists.
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

  const validated = validatePlayerInput({
    firstName: form.get('first'),
    birthYear: form.get('birth'),
    level: form.get('level'),
    position: form.get('position'),
    shoots: form.get('shoots'),
    stickFlex: form.get('flex'),
    focusPillars: form.getAll('pillars'),
    trainingDaysGoal: form.get('days'),
  });

  if (!validated.ok) {
    return to('/onboarding?error=missing_first_name');
  }

  const supabase = await createServerClient();
  const saved = await savePlayerProfile(session, supabase, validated.data);

  if (!saved.ok) {
    return to('/onboarding?error=save_failed');
  }

  return to('/dashboard');
}
