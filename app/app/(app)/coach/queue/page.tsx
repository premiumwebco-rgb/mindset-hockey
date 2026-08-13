import Link from 'next/link';
import { requireStaff } from '@/lib/session';
import { SUBMISSIONS } from '@/lib/demo-data';
import { Card, PageHeading, Stat } from '@/components/ui';

export const metadata = { title: 'Review Queue' };

function slaState(due: string) {
  const hours = (new Date(due).getTime() - Date.now()) / 36e5;
  if (hours < 0) return { label: 'Overdue', cls: 'border-red-400/40 bg-red-400/10 text-red-300' };
  if (hours < 24) return { label: `${Math.round(hours)}h left`, cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
  return { label: `${Math.round(hours)}h left`, cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' };
}

export default async function CoachQueue() {
  await requireStaff();

  const queue = SUBMISSIONS.filter((s) => s.status === 'queued' || s.status === 'in_review').sort(
    (a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt)
  );

  const overdue = queue.filter((s) => new Date(s.slaDueAt).getTime() < Date.now()).length;

  return (
    <>
      <PageHeading
        eyebrow="Coach console"
        title="Review queue"
        sub="Oldest first, always. Turnaround is the product — a 48-hour median is what makes $80/month defensible against a $20 library."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="In queue" value={queue.length} />
        <Stat label="Overdue" value={overdue} />
        <Stat label="Capacity used" value={`${Math.round((queue.length / 40) * 100)}%`} />
      </div>

      <div className="grid gap-3">
        {queue.map((s) => {
          const sla = slaState(s.slaDueAt);
          return (
            <Card key={s.id} hover className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.14em] ${sla.cls}`}
                    >
                      {sla.label}
                    </span>
                    <span className="rounded-md bg-white/[.05] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-silver-dim">
                      {s.level}
                    </span>
                    <span className="text-[11.5px] uppercase tracking-[.12em] text-silver-dim">
                      {s.shotType.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[16px] font-semibold text-white">{s.playerName}</p>
                  {s.playerNotes && (
                    <p className="mt-1 max-w-[62ch] text-[13.5px] text-silver-dim">
                      &ldquo;{s.playerNotes}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 text-[12px] text-silver-dim">
                    Submitted {new Date(s.submittedAt).toLocaleString()}
                  </p>
                </div>

                <Link
                  href={`/coach/review/${s.id}`}
                  className="shrink-0 rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold text-white hover:bg-electric-glow"
                >
                  Review
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-6">
        <h3 className="display mb-2 text-[18px]">Capacity note</h3>
        <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-silver-dim">
          At roughly 25 minutes of coach time per Advanced member per month, one reviewer caps out
          around 250 Advanced members. Hire or train the second reviewer <em>before</em> you hit
          that, not after — a blown SLA is the fastest way to lose a subscription in this market,
          and hockey parents talk to each other.
        </p>
      </Card>
    </>
  );
}
