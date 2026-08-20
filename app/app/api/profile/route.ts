import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { validatePlayerInput, savePlayerProfile } from '@/lib/player-profile';

export const runtime = 'nodejs';

/**
 * Edit Profile — lets a member update the same fields onboarding collected.
 *
 * Shares validation and the write itself with POST /api/onboarding via
 * lib/player-profile.ts, so there is one save path for "set up your player"
 * and "update your player" rather than two.
 *
 * Authorization: requireSession() is the app-layer gate; the real boundary
 * is "own players" RLS (migration 0001) enforced inside savePlayerProfile()
 * via the session-scoped client — a caller can only ever write the row whose
 * profile_id equals their own auth.uid(). No service-role client is used.
 */
export async function PATCH(req: Request) {
  const session = await requireSession();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validated = validatePlayerInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = await createServerClient();
  const saved = await savePlayerProfile(session, supabase, validated.data);

  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
