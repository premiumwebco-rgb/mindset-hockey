import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireFeature } from '@/lib/session';
import { getMindsetLessonForViewing } from '@/lib/data';
import { Button, Card, formatDuration } from '@/components/ui';
import { SmartVideo, SmartImage } from '@/components/media/SmartMedia';
import MarkCompleteButton from './MarkCompleteButton';

export const metadata = { title: 'Lesson — Mindset Development' };

/** Signed URLs are short-lived, so this page must never be cached. */
export const dynamic = 'force-dynamic';

/* ==========================================================================
   MINDSET LESSON PLAYBACK

   Mirrors app/(app)/library/[id]/page.tsx card-for-card: the signed URL is
   minted inside getMindsetLessonForViewing() (lib/data.ts), after the row is
   confirmed published and hasTier() has passed, and it is signed through the
   member's own Supabase session so the storage policy from migration 0008 is
   what actually authorizes the read.

   There is deliberately no API endpoint that hands out a URL for a lesson
   slug. An unauthorized member has nothing to call — the URL only ever comes
   into existence inside this server render, on the branch where every gate
   already passed.
   ========================================================================== */

const CATEGORY_LABEL: Record<string, string> = {
  confidence: 'Confidence',
  visualization: 'Visualization',
  resilience: 'Resilience',
  leadership: 'Leadership',
  focus: 'Focus',
  pressure_performance: 'Pressure Performance',
  goal_setting: 'Goal Setting',
  mental_recovery: 'Mental Recovery',
};

export default async function MindsetLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Same feature gate as the /mindset list page. The per-lesson required_tier
  // check inside getMindsetLessonForViewing() is a second, independent gate —
  // defence in depth, same convention as every other gated route in this app.
  const session = await requireFeature('mindset_training');
  const { slug } = await params;

  const access = await getMindsetLessonForViewing(session, slug);

  if (!access.ok) {
    // Under-tiered members are sent to upgrade; everything else is a 404. A
    // draft returns 'not_found' rather than 'locked' — a member should not be
    // able to discover that an unpublished lesson exists by probing slugs.
    if (access.reason === 'locked') redirect(`/upgrade?need=${access.requiredTier}`);
    notFound();
  }

  const { lesson } = access;
  const categoryLabel = lesson.category ? (CATEGORY_LABEL[lesson.category] ?? lesson.category) : lesson.topic;

  return (
    <>
      <Link
        href="/mindset"
        className="-m-2 mb-4 inline-block p-2 text-[13.5px] text-silver-dim hover:text-white"
      >
        ← Mindset Development
      </Link>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-md border border-white/10 bg-navy-700/60 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[.12em] text-silver-dim">
            {categoryLabel}
          </span>
          {!lesson.isPublished && (
            <span className="rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-amber">
              Draft — staff only
            </span>
          )}
          {lesson.completed && (
            <span className="rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#3ddc84]">
              Completed
            </span>
          )}
        </div>
        <h1 className="display text-[clamp(26px,4vw,42px)]">{lesson.title}</h1>
        {lesson.summary && (
          <p className="mt-3 max-w-[64ch] text-[16px] text-silver">{lesson.summary}</p>
        )}
        {lesson.durationSec !== null && (
          <p className="mt-2 text-[13px] tabular-nums text-silver-dim">
            {formatDuration(lesson.durationSec)}
          </p>
        )}
      </div>

      <div className="mb-6">
        {lesson.videoSignedUrl ? (
          <SmartVideo
            key={lesson.id}
            src={lesson.videoSignedUrl}
            fallbackLabel="lesson video"
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            poster={lesson.thumbnailSignedUrl ?? undefined}
            className="aspect-video w-full rounded-xl border border-white/[.08] bg-navy-900"
          />
        ) : lesson.thumbnailSignedUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-white/[.08] bg-navy-900">
            <SmartImage
              key={lesson.id}
              src={lesson.thumbnailSignedUrl}
              fallbackLabel="cover image"
              alt={lesson.title}
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-0 grid place-items-center bg-ink/30">
              <p className="rounded-full bg-ink/80 px-4 py-2 text-[12.5px] font-semibold text-silver-dim">
                Video coming soon
              </p>
            </div>
          </div>
        ) : (
          <Card className="grid aspect-video place-items-center p-8 text-center">
            <p className="text-[14.5px] text-silver-dim">
              This lesson doesn&apos;t have a video yet. Check back soon.
            </p>
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h2 className="display mb-3 text-[19px]">Put it into practice</h2>
        <p className="mb-5 max-w-[60ch] text-[14.5px] text-silver-dim">
          Watch it once through, then apply it in your next practice or game — the mental side
          compounds the same way the physical side does.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <MarkCompleteButton slug={lesson.slug} initialCompleted={lesson.completed} />
          <Button href="/mindset" variant="ghost">
            Back to Mindset Development
          </Button>
        </div>
      </Card>
    </>
  );
}
