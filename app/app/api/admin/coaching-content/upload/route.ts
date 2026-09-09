import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BUCKET = 'member-coaching-content';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB — plan PDFs/spreadsheets/images, not video.

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, '_')
    .slice(-120);
  return cleaned || 'file';
}

/**
 * STEP 1 of the admin upload flow — mirrors app/api/analysis/upload/route.ts.
 *
 * Creates a signed upload URL the browser PUTs the file straight to. The
 * destination path is <memberProfileId>/<timestamp>-<filename> — the first
 * path segment is what the storage RLS policy
 * (member_coaching_content_storage_write, migration 0024) checks
 * `auth_is_staff()` against, and it's also what member_coaching_content_read
 * later compares to `auth.uid()` for the MEMBER's own read access. Only
 * staff may call this at all (requireStaff()), and only staff may actually
 * write to this bucket (the storage policy), so a member can never use this
 * to upload into their own or anyone else's folder.
 */
export async function POST(req: Request) {
  await requireStaff();

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { profileId?: unknown; fileName?: unknown; fileSize?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const profileId = typeof body.profileId === 'string' ? body.profileId : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const fileSize = Number(body.fileSize ?? 0);

  if (!profileId) return NextResponse.json({ error: 'Select a member first.' }, { status: 400 });
  if (!fileName) return NextResponse.json({ error: 'A file name is required.' }, { status: 400 });
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });
  }
  if (fileSize > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is too large (50MB max).' }, { status: 400 });
  }

  const path = `${profileId}/${Date.now()}-${safeFileName(fileName)}`;

  const supabase = await createServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not create an upload URL.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path });
}
