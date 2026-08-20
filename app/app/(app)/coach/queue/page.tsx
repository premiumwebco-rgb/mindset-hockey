import Link from 'next/link';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { Card, PageHeading, Stat, EmptyState } from '@/components/ui';

export const metadata = { title: 'Review Queue' };

/* ==========================================================================
   REAL COACH QUEUE

   Previously hardcoded to lib/demo-data's SUBMISSIONS fixture, unconditionally
   — even outside demo mode. This now reads video_submissions directly.

   Deliberately NOT the `coach_queue` database view: that view inner-joins
   `players`, and video_submissions.player_id is nullable (a member can submit
   footage before ever completing onboarding — see app/api/reviews/route.ts).
   Joining on `profiles` instead — which every signed-up account has via the
   handle_new_user() trigger — means a submission is never invisible to a
   coach just because the player profile isn't filled in yet.

   Authorization: vsub_staff_all (migration 0002) lets any coach/admin read
   every row here — requireStaff() above is the app-layer gate, RLS is the
   real one.
   ========================================================================== */

interface QueueRow {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  player_notes: string | null;
  notes: string | null;
  sla_due_at: string | null;
  created_at: string;
  submitted_at: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

function slaState(due: string | null) {
  if (!due) {
    return { label: 'No SLA set', cls: 'border-white/20 bg-white/[.05] text-silver-dim' };
  }
  const hours = (new Date(due).getTime() - Date.now()) / 36e5;
  if (hours < 0) return { label: 'Overdue', cls: 'border-red-400/40 bg-red-400/10 text-red-300' };
  if (hours < 24) return { label: `${Math.round(hours)}h left`, cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
  return { label: `${Math.round(hours)}h left`, cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' };
}

export default async function CoachQueue() {
  await requireStaff();

  if (DEMO_MODE) {
    return (
      <>
        <PageHeading
          eyebrow="Coach console"
          title="Review queue"
          sub="Oldest first, always. Turnaround is the product."
        />
        <EmptyState
          title="Demo mode"
          body="Connect Supabase to see real video review submissions waiting on a coach. Nothing is mocked up here."
        />
      </>
    );
  }

  const supabase = await createServerClient();

  const { data } = await supabase
    .from('video_submissions')
    .select('id, title, kind, status, player_notes, notes, sla_due_at, created_at, submitted_at, profiles(full_name, email)')
    .in('status', ['queued', 'in_review'])
    .order('created_at', { ascending: true })
    .limit(100);

  const queue = (data ?? []) as unknown as QueueRow[];
  const overdue = queue.filter((s) => s.sla_due_at && new Date(s.sla_due_at).getTime() < Date.now()).length;

  return (
    <>
      <PageHeading
        eyebrow="Coach console"
        title="Review queue"
        sub="Oldest first, always. Turnaround is the product — a fast, honest turnaround is what makes this membership defensible."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="In queue" value={queue.length} />
        <Stat label="Overdue" value={overdue} />
        <Stat label="Capacity used" value={`${Math.round((queue.length / 40) * 100)}%`} />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          body="Every submitted clip has a coach response. New submissions appear here the moment a member uploads one."
        />
      ) : (
        <div className="grid gap-3">
          {queue.map((s) => {
            const sla = slaState(s.sla_due_at);
            const submittedAt = s.submitted_at ?? s.created_at;
            const player = s.profiles?.full_name || s.profiles?.email || 'Member';
            const note = s.notes ?? s.player_notes;
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
                      <span className="text-[11.5px] uppercase tracking-[.12em] text-silver-dim">
                        {s.kind}
                      </span>
                      {s.status === 'in_review' && (
                        <span className="rounded-md bg-white/[.05] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-silver-dim">
                          In review
                        </span>
                      )}
                    </div>
                    <p className="text-[16px] font-semibold text-white">{player}</p>
                    <p className="text-[13.5px] text-silver-dim">{s.title || 'Untitled submission'}</p>
                    {note && (
                      <p className="mt-1 max-w-[62ch] text-[13.5px] text-silver-dim">
                        &ldquo;{note}&rdquo;
                      </p>
                    )}
                    <p className="mt-1.5 text-[12px] text-silver-dim">
                      Submitted {new Date(submittedAt).toLocaleString()}
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
      )}

      <Card className="mt-8 p-6">
        <h3 className="display mb-2 text-[18px]">Capacity note</h3>
        <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-silver-dim">
          At roughly 25 minutes of coach time per premium member per month, one reviewer caps out
          around 250 members. Hire or train a second reviewer <em>before</em> you hit that, not
          after — a blown SLA is the fastest way to lose a subscription in this market.
        </p>
      </Card>
    </>
  );
}
