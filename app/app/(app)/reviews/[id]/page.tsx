import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireFeature } from '@/lib/session';
import { getSubmissionForViewing } from '@/lib/data';
import { Card, EmptyState } from '@/components/ui';
import { SmartVideo } from '@/components/media/SmartMedia';

export const metadata = { title: 'Submission — Video Review' };

/** Signed video URLs are short-lived, so this page must never be cached. */
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  uploading: 'Uploading',
  queued: 'Queued',
  in_review: 'With a coach',
  reviewed: 'Feedback ready',
  failed: 'Upload failed',
};

/* ==========================================================================
   MEMBER-FACING SUBMISSION DETAIL

   Previously /reviews only showed a status pill — there was nowhere for a
   member to actually read the coach's feedback once it existed, because
   nothing published feedback in the first place. Now that
   ReviewEditor/ /api/coach/reviews/[id]/feedback actually writes to
   submission_feedback, this is where a member reads it.

   Ownership is enforced by RLS (vsub_own_read) inside
   getSubmissionForViewing() — a stranger's id 404s rather than leaking
   another member's video or notes.
   ========================================================================== */

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireFeature('video_review');
  const { id } = await params;

  const access = await getSubmissionForViewing(session, id);
  if (!access.ok) notFound();

  const { submission } = access;

  return (
    <>
      <Link href="/reviews" className="-m-2 mb-4 inline-block p-2 text-[13.5px] text-silver-dim hover:text-white">
        ← Video review
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(24px,4vw,36px)]">{submission.title}</h1>
          <p className="mt-1.5 text-[13px] capitalize text-silver-dim">
            {submission.kind} · {new Date(submission.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
            submission.status === 'reviewed'
              ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
              : 'border-amber/40 bg-amber/10 text-amber'
          }`}
        >
          {STATUS_LABEL[submission.status] ?? submission.status}
        </span>
      </div>

      {submission.notes && (
        <Card className="mb-6 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">What you asked about</p>
          <p className="mt-2 text-[14.5px] text-silver">&ldquo;{submission.notes}&rdquo;</p>
        </Card>
      )}

      <div className="mb-6">
        {submission.videoSignedUrl ? (
          <SmartVideo
            src={submission.videoSignedUrl}
            fallbackLabel="submission"
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="aspect-video w-full rounded-xl border border-white/[.08] bg-navy-900"
          />
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-white/[.14] bg-navy-900">
            <p className="text-[12px] uppercase tracking-[.2em] text-silver-dim">
              {submission.status === 'uploading' ? 'Upload not finished' : 'No video stored'}
            </p>
          </div>
        )}
      </div>

      {submission.feedback ? (
        <Card className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">Coach feedback</p>
          <p className="mt-1 text-[12px] text-silver-dim">
            {new Date(submission.feedback.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-silver">{submission.feedback.body}</p>
        </Card>
      ) : (
        <EmptyState
          title="Feedback not ready yet"
          body="A coach hasn't published notes on this one yet. You'll see them here the moment they do."
        />
      )}
    </>
  );
}
