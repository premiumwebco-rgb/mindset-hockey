import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PROGRAMS = new Set(['summer_training', 'summer_camp']);

/**
 * Member-facing: joins the Summer Training / Summer Camp waitlist at Capital
 * Clubhouse. Same shape as app/api/coaching/request/route.ts — written
 * through the session client (not admin), so program_waitlist_signups'
 * own-insert RLS policy is the actual enforcement, matching
 * `WITH CHECK (profile_id = auth.uid())` — see migration
 * 0021_program_waitlist_signups.sql.
 */
export async function POST(req: Request) {
  const session = await requireSession();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { program?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const program =
    typeof body.program === 'string' && PROGRAMS.has(body.program) ? body.program : null;
  if (!program) {
    return NextResponse.json({ error: 'Choose Summer Training or Summer Camp.' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null;

  const supabase = await createServerClient();
  const { error } = await supabase.from('program_waitlist_signups').insert({
    profile_id: session.userId,
    program,
    notes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
