import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Member-facing: submits a 1-on-1 Video Coaching availability request.
 * Written through the session client (not admin) — RLS's
 * `one_on_one_requests_own_insert` policy (migration 0024) is the actual
 * enforcement, `profile_id` can only ever be the caller's own id. Mirrors
 * app/api/coaching/request/route.ts exactly.
 */
export async function POST(req: Request) {
  const session = await requireSession();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { availability?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const availability = typeof body.availability === 'string' ? body.availability.trim().slice(0, 2000) : '';
  if (!availability) {
    return NextResponse.json({ error: 'Let us know what times generally work for you.' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null;

  const supabase = await createServerClient();
  const { error } = await supabase.from('one_on_one_requests').insert({
    profile_id: session.userId,
    availability,
    notes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
