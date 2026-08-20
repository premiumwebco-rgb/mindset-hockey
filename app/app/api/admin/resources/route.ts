import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { signPreviewPaths } from '@/lib/admin-signed-urls';

export const runtime = 'nodejs';

const BUCKET = 'training-resources';

/** Accepted training assets. Kept deliberately narrow. */
const ACCEPTED: Record<string, 'video' | 'pdf' | 'image'> = {
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — coach film is large

/**
 * The six pillars. Every training resource belongs to exactly ONE.
 *
 * Mirrors the CHECK constraint in migration 0009 — the database is the real
 * enforcement, this is the fast, friendly rejection. There is deliberately no
 * 'none' and no 'other': a lesson that is not filed is not a lesson.
 *
 * NOTE: the 5-second limit on AI Shot Analysis does NOT apply here. Training
 * resources are full instructional videos (6:20, 11:40, ...). The two upload
 * systems are separate and share no duration logic.
 */
const PILLARS = ['mindset', 'mechanics', 'skill', 'systems', 'habits', 'leadership'] as const;
type Pillar = (typeof PILLARS)[number];

function isPillar(value: unknown): value is Pillar {
  return typeof value === 'string' && (PILLARS as readonly string[]).includes(value);
}

/**
 * Strips anything that could escape the intended folder, mirroring the member
 * upload path. Paths are always built server-side; the client never supplies one.
 */
function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, '_')
    .slice(-120);
  return cleaned || 'resource';
}

/* ==========================================================================
   TRAINING RESOURCE UPLOAD  —  STAFF ONLY

   AUTHORIZATION IS SERVER-SIDE AND DOUBLE-ENFORCED.
   `requireStaff()` reads profiles.role from the authenticated session — never
   from a header, query string or body. Beneath it, the storage policies from
   migration 0008 require auth_is_staff() on the bucket, and the
   training_resources RLS policy requires it on the row. A member who crafted a
   request would be refused twice over, and the second refusal is the database.

   Uploads go through a SIGNED URL rather than through this server, so a 500 MB
   coach video never has to fit in a serverless request body. The destination
   path is derived here; the browser only gets permission to write to it.
   ========================================================================== */

/** GET — list resources for the admin console. Staff only. */
export async function GET() {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ resources: [] });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('training_resources')
    .select(
      'id, title, description, kind, pillar, category, cover_image_url, required_tier, is_published, size_bytes, duration_sec, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[resources] list failed:', error.message);
    return NextResponse.json({ error: 'Could not load resources.' }, { status: 500 });
  }

  // Cover thumbnails are private storage paths — sign them here so the admin
  // console can render <img> tags without a per-card round trip. Uses the
  // STAFF session client, same authorization boundary as every read below.
  const rows = data ?? [];
  const supabase = await createServerClient();
  const signed = await signPreviewPaths(
    supabase,
    rows.map((r) => (r as { cover_image_url: string | null }).cover_image_url)
  );
  const resources = rows.map((r) => {
    const row = r as { cover_image_url: string | null };
    return { ...r, cover_image_signed_url: row.cover_image_url ? signed.get(row.cover_image_url) ?? null : null };
  });

  return NextResponse.json({ resources });
}

/**
 * POST — reserve an upload slot.
 *
 * Creates the catalogue row and returns a signed URL the browser PUTs the file
 * to. Returns 403 for anyone who is not staff.
 */
export async function POST(req: Request) {
  const session = await requireStaff();
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: 'Demo mode — connect Supabase to upload training resources.' },
      { status: 503 }
    );
  }

  let body: {
    title?: string;
    description?: string;
    category?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    requiredTier?: string;
    pillar?: string;
    durationSec?: number | null;
    coverImagePath?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });

  // Exactly one pillar, always. Missing and invalid are both refused here, and
  // the database CHECK constraint refuses them again underneath.
  if (!isPillar(body.pillar)) {
    return NextResponse.json(
      { error: `Choose a pillar: ${PILLARS.join(', ')}.` },
      { status: 400 }
    );
  }
  const pillar: Pillar = body.pillar;

  const fileName = String(body.fileName ?? '').trim();
  if (!fileName) return NextResponse.json({ error: 'A file is required.' }, { status: 400 });

  const mime = String(body.fileType ?? '');
  const kind = ACCEPTED[mime];
  if (!kind) {
    return NextResponse.json(
      { error: 'Use an MP4, MOV, WEBM, PDF, JPG, PNG or WEBP file.' },
      { status: 400 }
    );
  }

  const size = Number(body.fileSize ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 400 }
    );
  }

  // Only the two real tiers are selectable; anything else falls back to the
  // stricter of the two rather than accidentally publishing to everyone.
  const requiredTier = body.requiredTier === 'premium' ? 'premium' : 'basic';

  // Cosmetic running time for the library card. Uploaded by staff, so there is
  // nothing to defend against — anything out of range is simply dropped and the
  // card renders without a duration badge. Unrelated to the AI Shot Analysis
  // limit, which never trusts a client-supplied number.
  const rawDuration = Number(body.durationSec);
  const duration =
    Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 86400
      ? Math.round(rawDuration)
      : null;

  const admin = await createAdminClient();

  const { data: created, error: insertError } = await admin
    .from('training_resources')
    .insert({
      title,
      description: String(body.description ?? '').trim().slice(0, 2000) || null,
      category: String(body.category ?? '').trim().slice(0, 80) || null,
      cover_image_url: typeof body.coverImagePath === 'string' ? body.coverImagePath : null,
      pillar,
      kind,
      // Placeholder until the path is derived from the new row's id.
      storage_path: 'pending',
      mime_type: mime,
      size_bytes: size,
      duration_sec: duration,
      required_tier: requiredTier,
      is_published: false,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    console.error('[resources] insert failed:', insertError?.message);
    return NextResponse.json({ error: 'Could not create that resource.' }, { status: 500 });
  }

  // Path is derived server-side from the row id, never from client input.
  const path = `${created.id}/${safeFileName(fileName)}`;

  // Uses the STAFF session client, so the storage policy from 0008 is what
  // actually authorizes the write — the service-role client would bypass RLS
  // and prove nothing about whether production permissions are correct.
  const supabase = await createServerClient();
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (signError || !signed) {
    // Roll back the catalogue row so a failed upload leaves no orphan.
    await admin.from('training_resources').delete().eq('id', created.id);
    console.error('[resources] signed url failed:', signError?.message);
    return NextResponse.json(
      { error: 'Could not start that upload. Check the training-resources bucket exists.' },
      { status: 500 }
    );
  }

  await admin.from('training_resources').update({ storage_path: path }).eq('id', created.id);

  return NextResponse.json({
    id: created.id,
    path,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}

/** PATCH — edit metadata or publish/unpublish. Staff only. */
export async function PATCH(req: Request) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  let body: {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    requiredTier?: string;
    isPublished?: boolean;
    sortOrder?: number;
    pillar?: string;
    coverImagePath?: string | null;
    removeCoverImage?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  // Cover image replace/remove — delete the old stored object first so a
  // replace or a removal never leaves an orphaned file behind.
  if (typeof body.coverImagePath === 'string' || body.removeCoverImage) {
    const admin = await createAdminClient();
    const { data: row } = await admin
      .from('training_resources')
      .select('cover_image_url')
      .eq('id', body.id)
      .maybeSingle();
    const oldPath = (row as { cover_image_url: string | null } | null)?.cover_image_url;
    if (oldPath) {
      const supabase = await createServerClient();
      await supabase.storage.from('training-resources').remove([oldPath]);
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.coverImagePath === 'string') patch.cover_image_url = body.coverImagePath;
  if (body.removeCoverImage) patch.cover_image_url = null;
  if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200);
  if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 2000);
  if (typeof body.category === 'string') patch.category = body.category.trim().slice(0, 80);
  if (body.requiredTier === 'basic' || body.requiredTier === 'premium') {
    patch.required_tier = body.requiredTier;
  }
  // Re-filing is allowed; filing into nonsense is not.
  if (body.pillar !== undefined) {
    if (!isPillar(body.pillar)) {
      return NextResponse.json(
        { error: `Choose a pillar: ${PILLARS.join(', ')}.` },
        { status: 400 }
      );
    }
    patch.pillar = body.pillar;
  }
  if (typeof body.isPublished === 'boolean') patch.is_published = body.isPublished;
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    patch.sort_order = Math.trunc(body.sortOrder);
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('training_resources').update(patch).eq('id', body.id);

  if (error) {
    console.error('[resources] update failed:', error.message);
    return NextResponse.json({ error: 'Could not update that resource.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE — remove a resource and its stored file.
 *
 * Storage first: an orphaned object is worse than an orphaned row, because
 * nothing in the UI would ever surface it for deletion again.
 */
export async function DELETE(req: Request) {
  const session = await requireStaff();
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Only an admin can delete resources.' }, { status: 403 });
  }
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();
  const { data: row } = await admin
    .from('training_resources')
    .select('storage_path, cover_image_url')
    .eq('id', id)
    .maybeSingle();

  const toRemove = [
    row?.storage_path && row.storage_path !== 'pending' ? (row.storage_path as string) : null,
    (row as { cover_image_url: string | null } | null)?.cover_image_url ?? null,
  ].filter((p): p is string => Boolean(p));

  if (toRemove.length > 0) {
    const supabase = await createServerClient();
    await supabase.storage.from(BUCKET).remove(toRemove);
  }

  const { error } = await admin.from('training_resources').delete().eq('id', id);
  if (error) {
    console.error('[resources] delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete that resource.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
