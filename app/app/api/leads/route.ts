import { NextResponse } from 'next/server';
import { DEMO_MODE } from '@/lib/session';

/**
 * Lead capture from the PageFlow landing page, exit popup and assessment.
 * Deliberately permissive: never lose a lead to a validation error.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    const form = await req.formData().catch(() => null);
    if (form) payload = Object.fromEntries(form.entries());
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const row = {
    email,
    source: String(payload.source ?? 'landing'),
    player_age: payload.age ? Number(payload.age) : null,
    level: payload.level ? String(payload.level).toLowerCase() : null,
    utm: payload.utm ?? null,
  };

  if (DEMO_MODE) {
    console.log('[demo] lead captured', row);
    return NextResponse.json({ ok: true, demo: true });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();
  const { error } = await supabase.from('leads').upsert(row, { onConflict: 'email,source' });

  if (error) {
    // Log, but still return ok — a duplicate is not a user-facing failure.
    console.error('lead insert failed', error);
  }

  // TODO: enqueue the 5-email welcome sequence via Resend/ConvertKit.
  return NextResponse.json({ ok: true });
}
