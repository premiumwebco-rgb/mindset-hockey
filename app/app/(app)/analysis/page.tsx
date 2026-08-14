import Link from 'next/link';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { Button, Card, Eyebrow, EmptyState } from '@/components/ui';
import {
  STATUS_LABEL,
  STATUS_CLASS,
  formatDate,
  type AnalysisStatus,
} from '@/lib/ai/present';

export const metadata = { title: 'AI Shot Analysis — Mindset Hockey' };

interface Row {
  id: string;
  status: AnalysisStatus;
  overall_score: number | null;
  confidence: number | null;
  graded_count: number | null;
  shot_type: string;
  angle: string;
  created_at: string;
  error_message: string | null;
}

async function loadAnalyses(): Promise<Row[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();
  // RLS restricts this to the caller's own rows — no profile_id filter needed,
  // and adding one would not make it safer.
  const { data } = await supabase
    .from('shot_analyses')
    .select('id, status, overall_score, confidence, graded_count, shot_type, angle, created_at, error_message')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Row[];
}

export default async function AnalysisHistory() {
  // Gated at 'basic' — included with both Standard and Premium.
  await requireFeature('ai_shot_analysis');
  const rows = await loadAnalyses();

  const complete = rows.filter((r) => r.status === 'analyzed');
  const best = complete.reduce<number | null>(
    (max, r) => (r.overall_score !== null && (max === null || r.overall_score > max) ? r.overall_score : max),
    null
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>AI Shot Analysis</Eyebrow>
          <h1 className="display text-[clamp(28px,5vw,44px)]">Your shot, frame by frame</h1>
        </div>
        <Button href="/analysis/new">Analyze a Shot</Button>
      </div>

      <p className="mt-3 max-w-[64ch] text-[16px] text-silver">
        Upload a clip and get it graded against ten mechanics categories. It reads what the
        footage actually shows — anything it cannot see clearly comes back marked{' '}
        <span className="font-semibold text-white">insufficient footage</span> rather than guessed at.
      </p>

      {DEMO_MODE && (
        <p className="mt-4 rounded-lg border border-dashed border-amber/40 bg-amber/[.06] px-4 py-3 text-[13.5px] text-amber">
          Demo mode — connect Supabase and set an AI provider key to run real analyses.
        </p>
      )}

      {complete.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Analyses</p>
            <p className="display mt-2 text-[38px] leading-none">{rows.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Best score</p>
            <p className="display mt-2 text-[38px] leading-none">{best ?? '—'}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Completed</p>
            <p className="display mt-2 text-[38px] leading-none">{complete.length}</p>
          </Card>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No analyses yet"
            body="Film five shots of the same type from the side, about ten feet away with the whole body in frame. That is what makes a real breakdown possible."
            action={<Button href="/analysis/new">Analyze Your First Shot</Button>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/analysis/${r.id}`} className="block">
              <Card hover className="flex flex-wrap items-center gap-4 p-5">
                <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-xl border border-white/[.08] bg-navy-900">
                  {r.overall_score !== null ? (
                    <span className="display text-[22px] leading-none text-electric-glow">
                      {r.overall_score}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-silver-dim">
                      —
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize text-white">
                    {r.shot_type.replace('_', ' ')} · {r.angle} angle
                  </p>
                  <p className="mt-0.5 text-[13px] text-silver-dim">
                    {formatDate(r.created_at)}
                    {r.graded_count !== null && r.status === 'analyzed' && (
                      <> · {r.graded_count} of 10 categories graded</>
                    )}
                  </p>
                  {r.status === 'in_review' && r.error_message && (
                    <p className="mt-1.5 line-clamp-2 text-[13px] text-amber">{r.error_message}</p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
                    STATUS_CLASS[r.status] ?? STATUS_CLASS.queued
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 max-w-[70ch] text-[13px] leading-relaxed text-silver-dim">
        <span className="font-semibold text-silver">What this is and is not.</span> This grades
        still frames from your video the way a coach does stepping through film. It is not a
        biomechanics lab — it cannot measure joint angles, puck speed or force, and it never claims
        to. Every category carries a confidence level, and low-confidence reads should be treated as
        a starting point for a conversation with your coach.
      </p>
    </div>
  );
}
