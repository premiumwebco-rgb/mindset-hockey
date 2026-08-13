import Link from 'next/link';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { createPlaybackUrl } from '@/lib/ai/storage';
import { Card, PageHeading, Stat, EmptyState } from '@/components/ui';
import { parseCategories, formatDate } from '@/lib/ai/present';

export const metadata = { title: 'AI Review Queue — Mindset Hockey' };

/* ==========================================================================
   HUMAN FALLBACK QUEUE

   Where a clip lands when the AI could not confidently analyse it — no
   provider configured, the model failed, the response failed validation, or
   the member asked for a human look.

   Nothing here is fabricated. An analysis reaching this queue has NO scores
   attached, by design. The coach sees the athlete, the video, whatever the AI
   did manage (including its confidence), the member's note and the date.
   ========================================================================== */

interface QueueRow {
  id: string;
  profile_id: string;
  status: string;
  confidence: number | null;
  graded_count: number | null;
  overall_score: number | null;
  category_scores: unknown;
  shot_type: string;
  angle: string;
  player_notes: string | null;
  error_message: string | null;
  video_path: string | null;
  video_bucket: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

export default async function AiReviewQueue() {
  await requireStaff();

  if (DEMO_MODE) {
    return (
      <>
        <PageHeading
          eyebrow="Coach console"
          title="AI review queue"
          sub="Clips the AI could not confidently grade, waiting on a human."
        />
        <EmptyState
          title="Demo mode"
          body="Connect Supabase to see real analyses awaiting review. Nothing is mocked up here."
        />
      </>
    );
  }

  const supabase = await createServerClient();

  // Staff RLS policy (analyses_staff_all) is what permits reading other
  // members' rows here. A member hitting this URL is bounced by requireStaff
  // and would see nothing anyway.
  const { data } = await supabase
    .from('shot_analyses')
    .select(
      'id, profile_id, status, confidence, graded_count, overall_score, category_scores, shot_type, angle, player_notes, error_message, video_path, video_bucket, created_at, profiles(full_name, email)'
    )
    .in('status', ['in_review', 'failed'])
    .order('created_at', { ascending: true })
    .limit(100);

  const rows = (data ?? []) as unknown as QueueRow[];

  // Signed playback URLs are minted per row so the coach can watch without the
  // bucket ever being public.
  const withVideo = await Promise.all(
    rows.map(async (r) => ({
      row: r,
      videoUrl: r.video_path
        ? await createPlaybackUrl(supabase, r.video_path, r.video_bucket ?? 'member-videos')
        : null,
    }))
  );

  const noAiAtAll = rows.filter((r) => r.overall_score === null).length;

  return (
    <>
      <PageHeading
        eyebrow="Coach console"
        title="AI review queue"
        sub="Clips the AI could not confidently grade. Oldest first. These have no invented scores attached — that is the point."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Waiting" value={rows.length} />
        <Stat label="No AI scores" value={noAiAtAll} />
        <Stat
          label="Partial reads"
          value={rows.length - noAiAtAll}
          sub="AI graded some categories"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          body="Every uploaded clip has been analysed with enough confidence to stand on its own."
        />
      ) : (
        <div className="grid gap-4">
          {withVideo.map(({ row, videoUrl }) => {
            const cats = parseCategories(row.category_scores);
            const graded = cats.filter((c) => c.score !== null);
            const player = row.profiles?.full_name || row.profiles?.email || 'Member';

            return (
              <Card key={row.id} className="p-5">
                <div className="grid gap-5 md:grid-cols-[240px_1fr]">
                  <div>
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        className="w-full rounded-lg border border-white/[.08] bg-black"
                      />
                    ) : (
                      <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-white/[.14] text-[12px] text-silver-dim">
                        No video stored
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.14em] text-amber">
                        {row.status === 'failed' ? 'AI failed' : 'Needs a coach'}
                      </span>
                      <span className="text-[11.5px] capitalize tracking-[.12em] text-silver-dim">
                        {row.shot_type.replace('_', ' ')} · {row.angle}
                      </span>
                    </div>

                    <p className="text-[16px] font-semibold text-white">{player}</p>
                    <p className="mt-0.5 text-[12px] text-silver-dim">
                      Submitted {formatDate(row.created_at)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
                      <span className="text-silver-dim">
                        AI confidence:{' '}
                        <span className="font-semibold text-silver">
                          {row.confidence !== null ? `${Math.round(row.confidence * 100)}%` : 'none'}
                        </span>
                      </span>
                      <span className="text-silver-dim">
                        Categories graded:{' '}
                        <span className="font-semibold text-silver">
                          {graded.length} of 10
                        </span>
                      </span>
                    </div>

                    {row.error_message && (
                      <p className="mt-3 rounded-lg border border-white/[.08] bg-navy-900 px-3.5 py-2.5 text-[13px] text-silver-dim">
                        {row.error_message}
                      </p>
                    )}

                    {row.player_notes && (
                      <p className="mt-3 max-w-[62ch] text-[13.5px] text-silver">
                        <span className="font-semibold text-silver-dim">Member note: </span>
                        &ldquo;{row.player_notes}&rdquo;
                      </p>
                    )}

                    {graded.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {graded.map((c) => (
                          <span
                            key={c.key}
                            className="rounded-md bg-white/[.05] px-2 py-1 text-[10.5px] font-semibold text-silver-dim"
                          >
                            {c.key.replace(/_/g, ' ')} {c.score}/10
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/analysis/${row.id}`}
                      className="mt-4 inline-block rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-electric-glow"
                    >
                      Open full analysis
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
