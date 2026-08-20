import Link from 'next/link';
import { requireFeature } from '@/lib/session';
import { getSubmissions } from '@/lib/data';
import { Button, Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Video Review — Mindset Hockey' };

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  in_review: 'With a coach',
  reviewed: 'Feedback ready',
  failed: 'Upload failed',
};

export default async function ReviewsPage() {
  const session = await requireFeature('video_review');
  const subs = await getSubmissions(session);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Coach Review</Eyebrow>
          <h1 className="display text-[clamp(28px,5vw,44px)]">Video review</h1>
        </div>
        <Button href="/reviews/new">Submit Footage</Button>
      </div>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Send game, practice or training footage and a named coach comes back with written notes.
        Different from AI analysis — this is a human watching your shifts.
      </p>

      {subs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing submitted yet"
            body="Send a period of game film or a practice clip with a note about what you want looked at."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {subs.map((s) => (
            <Link key={s.id} href={`/reviews/${s.id}`} className="block">
              <Card hover className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="mt-0.5 text-[13px] capitalize text-silver-dim">
                    {s.kind} ·{' '}
                    {new Date(s.created_at).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                  {s.notes && <p className="mt-1.5 text-[14px] text-silver-dim">{s.notes}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
                    s.status === 'reviewed'
                      ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
                      : 'border-amber/40 bg-amber/10 text-amber'
                  }`}
                >
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
