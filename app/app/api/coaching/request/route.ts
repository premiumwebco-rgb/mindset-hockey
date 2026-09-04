import { NextResponse } from 'next/server';
import { requireSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Member-facing: submits a Custom Coaching request. Written through the
 * session client (not admin), so RLS's `custom_plan_requests_own_insert`
 * policy is the actual enforcement — `profile_id` can only ever be the
 * caller's own id, matching `WITH CHECK (profile_id = auth.uid())`.
 */
export async function POST(req: Request) {
  const session = await requireSession();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { services?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const services = Array.isArray(body.services)
    ? body.services.filter((s): s is string => typeof s === 'string').slice(0, 20)
    : [];
  if (services.length === 0) {
    return NextResponse.json({ error: 'Select at least one service.' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null;

  const supabase = await createServerClient();
  const { error } = await supabase.from('custom_plan_requests').insert({
    profile_id: session.userId,
    requested_services: services,
    notes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
