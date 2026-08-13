import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/session';
import { SUBMISSIONS } from '@/lib/demo-data';
import ReviewEditor from './ReviewEditor';

export const metadata = { title: 'Review Submission' };

export default async function CoachReview({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const sub = SUBMISSIONS.find((s) => s.id === id);
  if (!sub) notFound();

  return (
    <>
      <Link href="/coach/queue" className="mb-6 inline-block text-[13.5px] text-silver-dim hover:text-white">
        ← Queue
      </Link>

      <div className="mb-6">
        <p className="eyebrow mb-2">
          {sub.playerName} · {sub.level.toUpperCase()} · {sub.shotType.replace('_', ' ')} shot
        </p>
        <h1 className="display text-[clamp(26px,4vw,38px)]">Score the submission</h1>
        {sub.playerNotes && (
          <p className="mt-3 max-w-[62ch] rounded-lg border border-white/[.08] bg-navy-900 px-4 py-3 text-[14.5px] text-silver">
            <span className="font-semibold text-white">Player said:</span> &ldquo;{sub.playerNotes}&rdquo;
          </p>
        )}
      </div>

      <ReviewEditor submissionId={sub.id} />
    </>
  );
}
