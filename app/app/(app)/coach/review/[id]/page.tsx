import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { createSubmissionPlaybackUrl } from '@/lib/reviews-storage';
import { Card } from '@/components/ui';
import ReviewEditor from './ReviewEditor';

export const metadata = { title: 'Review Submission' };

/** Signed video URLs are short-lived, so this page must never be cached. */
export const dynamic = 'force-dynamic';

interface SubmissionRow {
  id: string;
  title: string | null;
  kind: string;
  notes: string | null;
  player_notes: string | null;
  video_path: string | null;
  status: string;
  profiles: { full_name: string | null; email: string } | null;
}

interface FeedbackRow {
  id: string;
  body: string;
  complete: boolean;
  created_at: string;
}

export default async function CoachReview({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  if (DEMO_MODE) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[14.5px] text-silver-dim">
          Demo mode — connect Supabase to review a real submission.
        </p>
        <Link href="/coach/queue" className="mt-4 inline-block text-[13.5px] text-electric-glow hover:underline">
          ← Back to queue
        </Link>
      </Card>
    );
  }

  const supabase = await createServerClient();

  // vsub_staff_all (migration 0002) is what actually permits a coach to read
  // any member's submission — requireStaff() above is the app-layer gate.
  const { data: sub } = await supabase
    .from('video_submissions')
    .select('id, title, kind, notes, player_notes, video_path, status, profiles(full_name, email)')
    .eq('id', id)
    .maybeSingle();

  if (!sub) notFound();
  const submission = sub as unknown as SubmissionRow;

  const videoUrl = await createSubmissionPlaybackUrl(supabase, submission.video_path);

  // Most recent feedback, if this submission has already been reviewed once
  // (a coach revisiting to correct or add to their notes).
  const { data: feedback } = await supabase
    .from('submission_feedback')
    .select('id, body, complete, created_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const player = submission.profiles?.full_name || submission.profiles?.email || 'Member';
  const note = submission.notes ?? submission.player_notes;

  return (
    <>
      <Link href="/coach/queue" className="mb-6 inline-block text-[13.5px] text-silver-dim hover:text-white">
        ← Queue
      </Link>

      <div className="mb-6">
        <p className="eyebrow mb-2">
          {player} · {submission.kind}
        </p>
        <h1 className="display text-[clamp(26px,4vw,38px)]">
          {submission.title || 'Score the submission'}
        </h1>
        {note && (
          <p className="mt-3 max-w-[62ch] rounded-lg border border-white/[.08] bg-navy-900 px-4 py-3 text-[14.5px] text-silver">
            <span className="font-semibold text-white">Player said:</span> &ldquo;{note}&rdquo;
          </p>
        )}
      </div>

      <ReviewEditor
        submissionId={submission.id}
        videoUrl={videoUrl}
        existingFeedback={(feedback as FeedbackRow | null) ?? null}
      />
    </>
  );
}
