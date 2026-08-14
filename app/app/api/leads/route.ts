import { NextResponse } from 'next/server';
import { DEMO_MODE } from '@/lib/session';

/**
 * Lead capture for the contact / free-assessment form.
 *
 * This is the only route into the business for anyone who is not ready to buy
 * a membership online — custom quotes, team packages and private on-ice
 * sessions all start here. It must not fail quietly.
 *
 * Deliberately permissive about validation: a malformed phone number is not a
 * reason to lose an enquiry. Only the email is required, because without it
 * there is no way to reply.
 */
export const runtime = 'nodejs';

/** Trim, cap length, and collapse empty strings to null for optional text. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    const form = await req.formData().catch(() => null);
    if (form) payload = Object.fromEntries(form.entries());
  }

  // Honeypot. Bots fill every field; humans never see this one. Return 200 so
  // the bot believes it succeeded and does not retry.
  if (text(payload.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const email = String(payload.email ?? '').trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address so we can reply.' },
      { status: 400 }
    );
  }

  const ageRaw = Number(payload.age);
  const row = {
    name: text(payload.name, 120),
    email,
    phone: text(payload.phone, 40),
    player_age: Number.isFinite(ageRaw) && ageRaw > 0 && ageRaw < 100 ? Math.trunc(ageRaw) : null,
    // 0001 typed this as an enum; 0002 widened it to text so free-form levels
    // like "16U A" survive. Stored as written.
    level: text(payload.level, 60),
    plan_interest: text(payload.plan, 40),
    goals: text(payload.goals ?? payload.training, 2000),
    source: text(payload.source, 40) ?? 'website',
    utm: payload.utm ?? null,
  };

  if (DEMO_MODE) {
    console.log('[demo] lead captured', { ...row, email: '<redacted>' });
    return NextResponse.json({ ok: true, demo: true });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();

  // Plain insert, NOT upsert. Migration 0002 deliberately drops the
  // unique (email, source) constraint from 0001 — the same family may enquire
  // more than once, and each enquiry is a separate thing to respond to.
  // An `onConflict: 'email,source'` here would raise 42P10 ("no unique or
  // exclusion constraint matching the ON CONFLICT specification") on EVERY
  // submission, which is exactly the bug this replaces.
  const { error } = await supabase.from('leads').insert(row);

  if (error) {
    // A lost lead is a lost customer. Surface it loudly in the server logs and
    // tell the caller honestly, so the form can offer the mailto fallback
    // instead of showing a success page for something that did not happen.
    console.error('[leads] insert failed:', error.message, error.code);
    return NextResponse.json(
      { error: 'We could not save that just now. Please email or call us instead.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
