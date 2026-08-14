import { NextResponse } from 'next/server';
import { getSession, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { deleteAnalysisObjects, deleteFrameObjects } from '@/lib/ai/storage';

export const runtime = 'nodejs';

/**
 * Deletes an analysis and the video behind it.
 *
 * Deliberately does NOT require an active membership — a lapsed member must
 * still be able to remove their own footage. Privacy outranks entitlement, and
 * the RLS delete policy in migration 0004 is written the same way.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  const supabase = await createServerClient();

  // RLS scopes this to rows the caller can see, so a guessed id belonging to
  // another member returns nothing.
  const { data: analysis, error } = await supabase
    .from('shot_analyses')
    .select('id, profile_id, video_bucket')
    .eq('id', id)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }
  if (analysis.profile_id !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Not your analysis.' }, { status: 403 });
  }

  // Storage first: an orphaned object is worse than an orphaned row, because
  // nothing in the UI would ever surface it for deletion again.
  await deleteAnalysisObjects(
    supabase,
    analysis.profile_id,
    id,
    analysis.video_bucket ?? 'member-videos'
  );
  // Archived frames live in a second bucket and would otherwise be orphaned —
  // these are stills of a minor, so "delete" has to mean all of it.
  await deleteFrameObjects(supabase, analysis.profile_id, id);

  const { error: deleteError } = await supabase.from('shot_analyses').delete().eq('id', id);
  if (deleteError) {
    // Log the real cause; never hand a Postgres/RLS message to the browser.
    console.error('[analysis] delete failed:', deleteError.message);
    return NextResponse.json({ error: 'Could not delete that analysis.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Flags an analysis for human coach review — the fallback when the AI could
 * not confidently read the footage.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { requestReview?: boolean; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.requestReview !== true) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('shot_analyses')
    .update({
      requested_review: true,
      status: 'in_review',
      ...(body.notes ? { player_notes: String(body.notes).slice(0, 2000) } : {}),
    })
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    if (error) console.error('[analysis] review request failed:', error.message);
    return NextResponse.json({ error: 'Could not request review.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, status: 'in_review' });
}
