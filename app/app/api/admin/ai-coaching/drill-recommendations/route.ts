import { NextResponse } from 'next/server';
import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ==========================================================================
   AI COACHING — DRILL RECOMMENDATIONS  (ADMIN ONLY)

   Backs Admin > AI Coaching > Drill Recommendations. Reads/writes
   ai_drill_recommendations (migration 0014) — the admin-controlled
   ai_category -> drill mapping that lib/library.ts's getDrillRecommendation()
   reads at runtime. There is no hardcoded category/drill logic anywhere in
   this file; every value comes from the request body or the database.

   AUTHORIZATION IS SERVER-SIDE AND DOUBLE-ENFORCED.
   requireAdmin() reads profiles.role from the authenticated session — never
   from a header, query string or body. Beneath it, 0014's RLS policy
   requires auth_is_admin() to write this table (stricter than most staff
   CMS tables here, per the build spec's explicit "only admins" requirement)
   and auth_is_staff() to read inactive rows. A non-admin who crafted a
   request by hand is refused twice, and the second refusal is Postgres itself.
   ========================================================================== */

const AI_CATEGORIES = [
  'setup_stance', 'weight_transfer', 'lower_body', 'hip_rotation',
  'shoulder_rotation', 'stick_loading', 'hand_position',
  'release_mechanics', 'follow_through', 'balance_stability',
] as const;

function isAiCategory(v: unknown): v is (typeof AI_CATEGORIES)[number] {
  return typeof v === 'string' && (AI_CATEGORIES as readonly string[]).includes(v);
}

function fail(scope: string, error: { message: string } | null, friendly: string, status = 500) {
  console.error(`[ai-coaching-cms] ${scope} failed:`, error?.message);
  return NextResponse.json({ error: friendly }, { status });
}

/* --------------------------------------------------------------------------
   GET — every mapping (with its drill's title/tier/published state embedded
   via the resource_id foreign key) + the full published drill list, so the
   admin UI can render a picker without a second round trip.
-------------------------------------------------------------------------- */
export async function GET() {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ mappings: [], drills: [] });

  const admin = await createAdminClient();

  const [{ data: mappings, error: mapError }, { data: drills, error: drillError }] = await Promise.all([
    admin
      .from('ai_drill_recommendations')
      .select(
        'id, ai_category, recommendation_kind, resource_id, priority, is_active, created_at, ' +
          'training_resources(id, title, pillar, required_tier, is_published)'
      )
      .order('ai_category', { ascending: true })
      .order('priority', { ascending: true }),
    admin
      .from('training_resources')
      .select('id, title, pillar, required_tier, is_published')
      .order('title', { ascending: true }),
  ]);

  if (mapError) return fail('list-mappings', mapError, 'Could not load drill recommendations.');
  if (drillError) return fail('list-drills', drillError, 'Could not load the drill library.');

  return NextResponse.json({ mappings: mappings ?? [], drills: drills ?? [] });
}

/* --------------------------------------------------------------------------
   POST — create a mapping.
-------------------------------------------------------------------------- */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode — connect Supabase first.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isAiCategory(body.aiCategory)) {
    return NextResponse.json({ error: 'A valid AI category is required.' }, { status: 400 });
  }
  const resourceId = typeof body.resourceId === 'string' ? body.resourceId : null;
  if (!resourceId) {
    return NextResponse.json({ error: 'A drill is required.' }, { status: 400 });
  }
  const priority = Number.isFinite(body.priority) ? Math.max(1, Math.round(body.priority as number)) : 1;
  const recommendationKind =
    typeof body.recommendationKind === 'string' && body.recommendationKind ? body.recommendationKind : 'drill';

  const admin = await createAdminClient();
  const { data: created, error } = await admin
    .from('ai_drill_recommendations')
    .insert({
      ai_category: body.aiCategory,
      recommendation_kind: recommendationKind,
      resource_id: resourceId,
      priority,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (error || !created) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return NextResponse.json(
        { error: 'That drill is already mapped to this category.' },
        { status: 409 }
      );
    }
    return fail('create', error, 'Could not create that mapping.');
  }

  return NextResponse.json({ id: created.id });
}

/* --------------------------------------------------------------------------
   PATCH — reorder priority, enable/disable. Never edits ai_category or
   resource_id; remove + re-add covers re-pointing a mapping.
-------------------------------------------------------------------------- */
export async function PATCH(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.priority === 'number' && Number.isFinite(body.priority)) {
    patch.priority = Math.max(1, Math.round(body.priority));
  }
  if (typeof body.isActive === 'boolean') {
    patch.is_active = body.isActive;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('ai_drill_recommendations').update(patch).eq('id', id);
  if (error) return fail('update', error, 'Could not update that mapping.');

  return NextResponse.json({ ok: true });
}

/* --------------------------------------------------------------------------
   DELETE — a mapping is just a pointer, so this is a real delete, not an
   archive. Removing it never touches the drill (training_resources) itself.
-------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  await requireAdmin();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('ai_drill_recommendations').delete().eq('id', id);
  if (error) return fail('delete', error, 'Could not remove that mapping.');

  return NextResponse.json({ ok: true, deleted: true });
}
