import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { PERMISSION_KEYS, isPermissionKey } from '@/lib/permissions';

export const runtime = 'nodejs';

const PERMISSION_KEY_SET = new Set<string>(PERMISSION_KEYS);

/**
 * Admin-only. Toggles one or more permission columns on a profile. Mirrors
 * the exact pattern in app/api/admin/user/route.ts — explicit whitelist
 * (nothing outside PERMISSION_KEYS can ever be written through this route),
 * every change logged to audit_log.
 *
 * Body: { id: string, permissions: Partial<Record<PermissionKey, boolean>> }
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

  const rawPermissions =
    body.permissions && typeof body.permissions === 'object'
      ? (body.permissions as Record<string, unknown>)
      : null;
  if (!rawPermissions) {
    return NextResponse.json({ error: 'Missing permissions object' }, { status: 400 });
  }

  const patch: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(rawPermissions)) {
    if (!PERMISSION_KEY_SET.has(key) || !isPermissionKey(key)) {
      return NextResponse.json({ error: `Unknown permission: ${key}` }, { status: 400 });
    }
    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: `Permission ${key} must be a boolean` }, { status: 400 });
    }
    patch[key] = value;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('profiles').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.permissions.update',
    target_table: 'profiles',
    target_id: id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
}
