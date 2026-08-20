import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { getResourceForViewing } from '@/lib/library';
import { Button, Card, PillarChip, formatDuration } from '@/components/ui';
import { SmartVideo, SmartImage } from '@/components/media/SmartMedia';

export const metadata = { title: 'Lesson' };

/** Signed URLs are short-lived, so this page must never be cached. */
export const dynamic = 'force-dynamic';

/* ==========================================================================
   LESSON PLAYBACK

   The signed URL is minted inside getResourceForViewing(), after the row is
   confirmed published and hasTier() has passed, and it is signed through the
   member's own Supabase session so the storage policy from 0008 is the thing
   that actually authorizes the read.

   There is deliberately NO API endpoint that hands out a URL for a resource
   id. An unauthorized member has nothing to call: the URL only ever comes into
   existence inside this server render, and only on the branch where every gate
   already passed.
   ========================================================================== */

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const access = await getResourceForViewing(session, id);

  if (!access.ok) {
    // Under-tiered members are sent to upgrade; everything else is a 404.
    // A draft returns 'not_found' rather than 'locked' — a member should not be
    // able to discover that an unpublished lesson exists by probing ids.
    if (access.reason === 'locked') redirect(`/upgrade?need=${access.requiredTier}`);
    notFound();
  }

  const { resource, signedUrl } = access;
  const isVideo = resource.kind === 'video';
  const isImage = resource.kind === 'image';

  return (
    <>
      <Link
        href={`/library?pillar=${resource.pillar}`}
        className="-m-2 mb-4 inline-block p-2 text-[13.5px] text-silver-dim hover:text-white"
      >
        ← Training library
      </Link>

      {/* Cover photo as a hero banner. Skipped when the resource itself IS an
          image — the content area below already shows it, and repeating it
          here would just be the same picture twice. */}
      {resource.coverImageSignedUrl && !isImage && (
        <div className="mb-6 overflow-hidden rounded-xl border border-white/[.08]">
          <SmartImage
            key={`${resource.id}-cover`}
            src={resource.coverImageSignedUrl}
            fallbackLabel="cover image"
            alt=""
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PillarChip pillar={resource.pillar} />
          {resource.category && (
            <span className="text-[11.5px] uppercase tracking-[.14em] text-silver-dim">
              {resource.category}
            </span>
          )}
          {!resource.isPublished && (
            <span className="rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-amber">
              Draft — staff only
            </span>
          )}
        </div>
        <h1 className="display text-[clamp(26px,4vw,42px)]">{resource.title}</h1>
        {resource.description && (
          <p className="mt-3 max-w-[64ch] text-[16px] text-silver">{resource.description}</p>
        )}
        {resource.durationSec !== null && (
          <p className="mt-2 text-[13px] tabular-nums text-silver-dim">
            {formatDuration(resource.durationSec)}
          </p>
        )}
      </div>

      <div className="mb-6">
        {isVideo ? (
          <SmartVideo
            key={resource.id}
            src={signedUrl}
            fallbackLabel="lesson video"
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="aspect-video w-full rounded-xl border border-white/[.08] bg-navy-900"
          />
        ) : isImage ? (
          <SmartImage
            key={resource.id}
            src={signedUrl}
            fallbackLabel="image"
            alt={resource.title}
            className="w-full rounded-xl border border-white/[.08] bg-navy-900"
          />
        ) : (
          <Card className="p-8 text-center">
            <p className="mb-5 text-[14.5px] text-silver-dim">
              This resource is a document. Open it in a new tab to read it.
            </p>
            {/* A plain anchor, not <Button>/<Link> — the signed URL is an
                external Supabase address and must not be prefetched or routed. */}
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold tracking-wide text-white transition-all duration-200 hover:bg-electric-glow"
            >
              Open resource
            </a>
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h2 className="display mb-3 text-[19px]">Put it on the ice</h2>
        <p className="mb-5 max-w-[60ch] text-[14.5px] text-silver-dim">
          Watch it once through, then run the reps. When you want feedback on your own shot, upload a
          clip and the AI will analyze it against the same framework.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/analysis/new">Analyze my shot</Button>
          <Button href={`/library?pillar=${resource.pillar}`} variant="ghost">
            More in this pillar
          </Button>
        </div>
      </Card>
    </>
  );
}
