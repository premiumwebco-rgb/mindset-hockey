import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_TIERS = new Set(['none', 'basic', 'premium']);
const ALLOWED_ROLES = new Set(['member', 'coach', 'admin']);

/** Admin-only. Every change is written to audit_log. */
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
