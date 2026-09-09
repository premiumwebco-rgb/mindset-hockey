import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { GROUP_SESSION_DEFAULT_PRICE_CENTS } from '@/lib/groupCoaching';

export const runtime = 'nodejs';

/**
 * Admin/coach-only. Create or edit a group coaching session.
 *
 * requireStaff() is the route guard here (any coach or admin can manage
 * sessions, same access level Admin > Coaching Content uses) — RLS's
 * group_coaching_sessions_staff_insert/update policies (migration 0024,
 * auth_is_staff()) are the real enforcement, this is the convenience 403.
 */
export async function POST(req: Request) {
  const session = await requireStaff();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
  const description = typeof body.description === 'string' ? body.description.slice(0, 4000) : null;
  const startAt = typeof body.startAt === 'string' ? body.startAt : '';
  const priceCents = Number.isFinite(Number(body.priceCents))
    ? Math.round(Number(body.priceCents))
    : GROUP_SESSION_DEFAULT_PRICE_CENTS;
  const capacityRaw = body.capacity;
  const capacity =
    capacityRaw === null || capacityRaw === '' || capacityRaw === undefined
      ? null
      : Number.isFinite(Number(capacityRaw))
        ? Math.round(Number(capacityRaw))
        : null;

  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
  const startDate = startAt ? new Date(startAt) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'A valid date/time is required.' }, { status: 400 });
  }
  if (priceCents <= 0) {
    return NextResponse.json({ error: 'Price must be greater than $0.' }, { status: 400 });
  }
  if (capacity !== null && capacity <= 0) {
    return NextResponse.json({ error: 'Capacity must be greater than 0, or left blank.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('group_coaching_sessions')
    .insert({
      title,
      description,
      start_at: startDate.toISOString(),
      price_cents: priceCents,
      capacity,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.group_session.create',
    target_table: 'group_coaching_sessions',
    target_id: data.id,
    meta: { title, start_at: startDate.toISOString(), price_cents: priceCents, capacity },
  });

  return NextResponse.json({ ok: true, id: data.id });
}

/** Admin/coach-only. Edits an existing session's details (not its status — see the cancel endpoint). */
export async function PATCH(req: Request) {
  const session = await requireStaff();

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
  if (!id) return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200);
  if (typeof body.description === 'string' || body.description === null) {
    patch.description = typeof body.description === 'string' ? body.description.slice(0, 4000) : null;
  }
  if (typeof body.startAt === 'string') {
    const d = new Date(body.startAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time.' }, { status: 400 });
    }
    patch.start_at = d.toISOString();
  }
  if (body.priceCents !== undefined) {
    const p = Math.round(Number(body.priceCents));
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: 'Price must be greater than $0.' }, { status: 400 });
    }
    patch.price_cents = p;
  }
  if (body.capacity !== undefined) {
    if (body.capacity === null || body.capacity === '') {
      patch.capacity = null;
    } else {
      const c = Math.round(Number(body.capacity));
      if (!Number.isFinite(c) || c <= 0) {
        return NextResponse.json({ error: 'Capacity must be greater than 0, or left blank.' }, { status: 400 });
      }
      patch.capacity = c;
    }
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('group_coaching_sessions').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.group_session.update',
    target_table: 'group_coaching_sessions',
    target_id: id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
}
