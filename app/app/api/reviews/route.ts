import { NextResponse } from 'next/server';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await requireFeature('video_review');

  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode — no backend connected.' }, { status: 503 });
  }

  let body: { title?: string; kind?: string; notes?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = (body.title ?? '').trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const kind = ['game', 'practice', 'training'].includes(body.kind ?? '')
    ? body.kind!
    : 'game';

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('video_submissions')
    .insert({
      profile_id: session.userId,
      title,
      kind,
      notes: (body.notes ?? '').slice(0, 2000) || null,
      video_path: body.fileName ?? '',
      status: 'queued',
      // Premium SLA: feedback back inside 72 hours.
      sla_due_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ id: data.id });
}
