import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { membershipPermissionPatch } from '@/lib/permissions';

export const runtime = 'nodejs';

const ALLOWED_TIERS = new Set(['none', 'basic', 'premium', 'membership']);
const ALLOWED_ROLES = new Set(['member', 'coach', 'admin']);

/**
 * Admin-only. Every change is written to audit_log.
 *
 * Whenever this patch touches `tier` and/or `subscription_active`, it also
 * cascades the 6 Membership permission columns (ai_shot_analysis, workouts,
 * nutrition, mindset, video_library, progress_tracking) via
 * membershipPermissionPatch() — the exact same function the Stripe webhook's
 * applyEntitlement() uses (app/api/stripe/webhook/route.ts). Before this, a
 * manual Active/Inactive toggle or tier change here only ever wrote
 * `tier`/`subscription_active`, leaving those 6 columns untouched — a member
 * could show ACTIVE in Admin > Users and in Admin > Overview's member count
 * while Plan Management still showed 0 of 11 permissions on, and the member
 * was locked out of every gated page. Coaching permissions (video_reviews,
 * weekly_checkins, direct_messaging, one_on_one_coaching, custom_programming)
 * are deliberately left untouched here, same as in the webhook — those stay
 * admin-managed only, from Admin > Plan Management.
 */
export async function PATCH(req: Request) {
  const session = await requireAdmin();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

  // Whitelist: never let arbitrary columns through from the client.
  const patch: Record<string, unknown> = {};
  if (typeof body.tier === 'string') {
    if (!ALLOWED_TIERS.has(body.tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    patch.tier = body.tier;
  }
  if (typeof body.role === 'string') {
    if (!ALLOWED_ROLES.has(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    // Guard against an admin removing their own last admin access by accident.
    if (id === session.userId && body.role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin role.' },
        { status: 400 }
      );
    }
    patch.role = body.role;
  }
  if (typeof body.subscription_active === 'boolean') {
    patch.subscription_active = body.subscription_active;
  }
  if (typeof body.suspended === 'boolean') patch.suspended = body.suspended;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const admin = await createAdminClient();

  // Membership permissions must move in lockstep with tier/subscription_active
  // — never just the label. Read whichever of the two this patch doesn't
  // already supply from the current row, so e.g. flipping just the Active
  // toggle still cascades correctly off the member's existing tier.
  if ('tier' in patch || 'subscription_active' in patch) {
    const { data: current, error: fetchError } = await admin
      .from('profiles')
      .select('tier, subscription_active')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const effectiveTier = (patch.tier as string | undefined) ?? current.tier;
    const effectiveActive =
      (patch.subscription_active as boolean | undefined) ?? current.subscription_active;

    Object.assign(patch, membershipPermissionPatch(effectiveTier, effectiveActive));
  }

  const { error } = await admin.from('profiles').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.user.update',
    target_table: 'profiles',
    target_id: id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
}
