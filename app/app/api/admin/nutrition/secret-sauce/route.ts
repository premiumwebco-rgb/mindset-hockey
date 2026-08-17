import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { validateSecretSauce, validateSources } from '@/lib/nutrition-admin';
import { sanitizeSearch } from '@/lib/nutrition';

export const runtime = 'nodejs';

/* ==========================================================================
   SECRET SAUCE  —  STAFF CMS

   Same authorization model as the recipes route: requireStaff() here, and the
   0012 RLS policies requiring auth_is_staff() underneath.

   ON CITATIONS
   Sources are stored as organization + title + year. `url` and `doi` are
   nullable and are only ever populated from what an admin actually types.
   Nothing in this system generates a citation link, because an unverified URL
   that looks authoritative is worse than no URL at all.

   ON SAFETY FIELDS
   who_should_avoid and side_effects are ordinary nullable columns, but the
   editor surfaces them next to dosage on purpose. This content covers
   caffeine, sodium bicarbonate and creatine among others, and a dose without
   its cautions is the failure mode worth designing against.
   ========================================================================== */

const LIST_COLUMNS =
  'id, slug, title, category, evidence_rating, status, required_tier, sort_order, updated_at';

function fail(scope: string, error: { message: string } | null, friendly: string, status = 500) {
  console.error(`[nutrition-cms] secret-sauce ${scope} failed:`, error?.message);
  return NextResponse.json({ error: friendly }, { status });
}

/** GET — list, or one full entry with its sources when ?id= is supplied. */
export async function GET(req: Request) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ entries: [], counts: {} });

  const { searchParams } = new URL(req.url);
  const admin = await createAdminClient();
  const id = searchParams.get('id');

  if (id) {
    const { data: entry, error } = await admin
      .from('nutrition_secret_sauce')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !entry) return fail('load', error, 'Could not find that entry.', 404);

    const { data: sources } = await admin
      .from('nutrition_secret_sauce_sources')
      .select('organization, title, publication_year, source_type, url, doi, sort_order')
      .eq('secret_sauce_id', id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ entry, sources: sources ?? [] });
  }

  const { data: statusRows } = await admin.from('nutrition_secret_sauce').select('status');
  const counts: Record<string, number> = { draft: 0, published: 0, archived: 0, total: 0 };
  for (const r of statusRows ?? []) {
    const s = (r as { status: string }).status;
    counts[s] = (counts[s] ?? 0) + 1;
    counts.total += 1;
  }

  let query = admin.from('nutrition_secret_sauce').select(LIST_COLUMNS);

  const status = searchParams.get('status');
  if (status && status !== 'all') query = query.eq('status', status);

  const rating = searchParams.get('evidence');
  if (rating) query = query.eq('evidence_rating', rating);

  // Allowlist-sanitised — same reasoning as the recipes route.
  const q = sanitizeSearch(searchParams.get('q'));
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
    .limit(300);

  if (error) return fail('list', error, 'Could not load Secret Sauce entries.');
  return NextResponse.json({ entries: data ?? [], counts });
}

/** Replaces the citation list for an entry. Same delete-and-reinsert as recipes. */
async function replaceSources(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  entryId: string,
  raw: unknown
): Promise<string | null> {
  if (raw === undefined) return null;

  const parsed = validateSources(raw);
  if (!parsed.ok) return parsed.error;

  await admin.from('nutrition_secret_sauce_sources').delete().eq('secret_sauce_id', entryId);
  if (parsed.value.length) {
    const { error } = await admin
      .from('nutrition_secret_sauce_sources')
      .insert(parsed.value.map((s) => ({ ...s, secret_sauce_id: entryId })));
    if (error) {
      console.error('[nutrition-cms] sources insert failed:', error.message);
      return 'Could not save the sources.';
    }
  }
  return null;
}

export async function POST(req: Request) {
  const session = await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = validateSecretSauce(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const admin = await createAdminClient();
  const { data: created, error } = await admin
    .from('nutrition_secret_sauce')
    .insert({ ...parsed.value, created_by: session.userId })
    .select('id, slug')
    .single();

  if (error || !created) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 });
    }
    return fail('create', error, 'Could not create that entry.');
  }

  const sourceError = await replaceSources(admin, created.id, body.sources);
  if (sourceError) return NextResponse.json({ error: sourceError }, { status: 400 });

  return NextResponse.json({ id: created.id, slug: created.slug });
}

export async function PATCH(req: Request) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();

  if (body.statusOnly === true) {
    const status = body.status;
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    const { error } = await admin.from('nutrition_secret_sauce').update({ status }).eq('id', id);
    if (error) return fail('status', error, 'Could not change that entry’s status.');
    return NextResponse.json({ ok: true });
  }

  const parsed = validateSecretSauce(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { error } = await admin.from('nutrition_secret_sauce').update(parsed.value).eq('id', id);
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 });
    }
    return fail('update', error, 'Could not save that entry.');
  }

  const sourceError = await replaceSources(admin, id, body.sources);
  if (sourceError) return NextResponse.json({ error: sourceError }, { status: 400 });

  return NextResponse.json({ ok: true });
}

/** DELETE — archive by default; ?hard=1 permanently removes, admin only. */
export async function DELETE(req: Request) {
  const session = await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();

  if (searchParams.get('hard') === '1') {
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only an admin can permanently delete an entry.' },
        { status: 403 }
      );
    }
    const { error } = await admin.from('nutrition_secret_sauce').delete().eq('id', id);
    if (error) return fail('hard-delete', error, 'Could not delete that entry.');
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await admin
    .from('nutrition_secret_sauce')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) return fail('archive', error, 'Could not archive that entry.');
  return NextResponse.json({ ok: true, archived: true });
}
