import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['new', 'contacted', 'active', 'declined']);

/** Admin-only. Updates a custom_plan_requests row's review status. */
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
  const status = typeof body.status === 'string' ? body.status : null;
  if (!id || !status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from('custom_plan_requests')
    .update({ status, handled_by: session.userId, handled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.plan_request.update',
    target_table: 'custom_plan_requests',
    target_id: id,
    meta: { status },
  });

  return NextResponse.json({ ok: true });
}
