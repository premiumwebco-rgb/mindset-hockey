import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VALID_TYPES = new Set(['workout', 'nutrition']);

/**
 * Admin/coach-only. Adds a piece of member-specific workout/nutrition
 * content. File upload (if any) happens separately through
 * /api/admin/coaching-content/upload BEFORE this call — this only writes the
 * row (with an optional file_path already sitting in storage).
 *
 * requireStaff() is the route guard; RLS's member_coaching_content_staff_*
 * policies (migration 0024, auth_is_staff()) are the real enforcement.
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

  const profileId = typeof body.profileId === 'string' ? body.profileId : null;
  const contentType = typeof body.contentType === 'string' ? body.contentType : null;
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null;
  const filePath = typeof body.filePath === 'string' ? body.filePath : null;
  const fileName = typeof body.fileName === 'string' ? body.fileName.slice(0, 200) : null;

  if (!profileId) return NextResponse.json({ error: 'Select a member.' }, { status: 400 });
  if (!contentType || !VALID_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });

  // A file uploaded via /api/admin/coaching-content/upload always lands at
  // <profileId>/... — refuse a mismatched path rather than silently
  // recording a pointer into the wrong member's folder.
  if (filePath && !filePath.startsWith(`${profileId}/`)) {
    return NextResponse.json({ error: 'File path does not match the selected member.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('member_coaching_content')
    .insert({
      profile_id: profileId,
      content_type: contentType,
      title,
      notes,
      file_path: filePath,
      file_name: filePath ? fileName : null,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.coaching_content.create',
    target_table: 'member_coaching_content',
    target_id: data.id,
    meta: { profile_id: profileId, content_type: contentType, title },
  });

  return NextResponse.json({ ok: true, id: data.id });
}

/** Admin/coach-only. Edits an existing content row's title/notes. */
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
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200);
  if (typeof body.notes === 'string' || body.notes === null) {
    patch.notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null;
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('member_coaching_content').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.coaching_content.update',
    target_table: 'member_coaching_content',
    target_id: id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
}

/** Admin/coach-only. Removes a content row (and its stored file, if any). */
export async function DELETE(req: Request) {
  const session = await requireStaff();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const admin = await createAdminClient();

  const { data: row } = await admin
    .from('member_coaching_content')
    .select('file_path')
    .eq('id', id)
    .single();

  const { error } = await admin.from('member_coaching_content').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.file_path) {
    await admin.storage.from('member-coaching-content').remove([row.file_path]);
  }

  await admin.from('audit_log').insert({
    actor_id: session.userId,
    action: 'admin.coaching_content.delete',
    target_table: 'member_coaching_content',
    target_id: id,
    meta: {},
  });

  return NextResponse.json({ ok: true });
}
