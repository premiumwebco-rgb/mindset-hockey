import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Admin/coach-only. Cancels a group coaching session AND refunds every
 * member who paid for it, through Stripe's real refund API — never by just
 * flipping a database column.
 *
 * ORDER OF OPERATIONS MATTERS:
 *
 *   1. Mark the session 'cancelled' FIRST. This is what
 *      /api/stripe/group-session/checkout/route.ts checks before opening a
 *      new Checkout Session, so cancelling immediately stops new purchases —
 *      before a single refund has even been attempted.
 *
 *   2. For every 'paid' registration on this session, refund it.
 *
 * IDEMPOTENCY / NO DOUBLE REFUNDS: each registration is claimed with a
 * conditional UPDATE — `status='paid' -> 'refunded'` guarded by
 * `.eq('status', 'paid')`, BEFORE the Stripe call. Postgres only lets one
 * caller's UPDATE match a given row's current status, so two concurrent
 * cancel requests (or a retried request) can never both claim the same
 * registration; the loser's update affects zero rows and is skipped —
 * that's what stops a duplicate refund. `stripe_refund_id`/`refunded_at`
 * are filled in only after Stripe actually confirms the refund; if the
 * Stripe call itself fails after the claim, the row is reverted back to
 * 'paid' so a retry can pick it up again — it is never left stuck.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id: sessionId } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  const admin = await createAdminClient();

  const { data: groupSession } = await admin
    .from('group_coaching_sessions')
    .select('id, title, status')
    .eq('id', sessionId)
    .single();

  if (!groupSession) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  // Step 1 — stop new purchases immediately, before any refund is attempted.
  if (groupSession.status !== 'cancelled') {
    await admin
      .from('group_coaching_sessions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }

  // Step 2 — refund every paid registration.
  const { data: registrations } = await admin
    .from('group_session_registrations')
    .select('id, profile_id, amount_cents, stripe_payment_intent_id, status')
    .eq('session_id', sessionId)
    .eq('status', 'paid');

  const s = stripe();
  const results: { registrationId: string; ok: boolean; error?: string }[] = [];

  for (const reg of registrations ?? []) {
    // Claim this specific row BEFORE calling Stripe — see the idempotency
    // note above. If another request already claimed it (or already
    // refunded it), this affects 0 rows and we move on without touching
    // Stripe a second time. stripe_refund_id stays null until Stripe
    // actually confirms the refund below.
    const { data: claimed } = await admin
      .from('group_session_registrations')
      .update({ status: 'refunded' })
      .eq('id', reg.id)
      .eq('status', 'paid')
      .select('id')
      .maybeSingle();

    if (!claimed) continue; // already handled by another request

    if (!reg.stripe_payment_intent_id) {
      // Nothing to refund through Stripe (shouldn't happen for a paid row,
      // but never leave the row silently marked 'refunded' with no actual
      // refund behind it) — revert the claim and flag it for manual review.
      await admin.from('group_session_registrations').update({ status: 'paid' }).eq('id', reg.id);
      results.push({ registrationId: reg.id, ok: false, error: 'No payment intent on file.' });
      continue;
    }

    try {
      const refund = await s.refunds.create({ payment_intent: reg.stripe_payment_intent_id });
      await admin
        .from('group_session_registrations')
        .update({ stripe_refund_id: refund.id, refunded_at: new Date().toISOString() })
        .eq('id', reg.id);
      results.push({ registrationId: reg.id, ok: true });
    } catch (err) {
      // Revert the claim so this registration can be retried (by re-cancelling
      // or a future admin action) rather than being left silently "refunded"
      // in the database with no real Stripe refund behind it.
      await admin.from('group_session_registrations').update({ status: 'paid' }).eq('id', reg.id);
      console.error('[group-session] refund failed for registration %s:', reg.id, err);
      results.push({ registrationId: reg.id, ok: false, error: (err as Error).message });
    }
  }

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.group_session.cancel',
    target_table: 'group_coaching_sessions',
    target_id: sessionId,
    meta: { title: groupSession.title, refund_results: results },
  });

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: true,
    refunded: results.filter((r) => r.ok).length,
    failed: failed.length,
    failures: failed,
  });
}
