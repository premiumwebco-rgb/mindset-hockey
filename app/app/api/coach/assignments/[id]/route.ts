import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Dismisses one assignment. This is a status update (status -> 'dismissed'),
 * never a row delete — there is no delete RLS policy on `assignments` at
 * all, by design, so a dismissed assignment stays as a record of what was
 * assigned. assignments_staff_update is the real authorization.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'dismiss') {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from('assignments').update({ status: 'dismissed' }).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
