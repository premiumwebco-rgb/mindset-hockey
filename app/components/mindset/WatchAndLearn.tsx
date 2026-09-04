import { Card } from '@/components/ui';

/* ==========================================================================
   WATCH & LEARN

   Renders a lesson's verified external (YouTube) video underneath the
   slideshow — a real, hockey-specific perspective from an outside creator
   that REINFORCES the lesson's own content rather than replacing it. Every
   video shown here was manually verified (title, channel, public
   availability) before being stored in mindset_lessons (migration 0018);
   this component only ever displays what's in the database, it never
   constructs or guesses a video URL itself.
   ========================================================================== */

/** Pulls the 11-character id out of a youtube.com/watch, youtu.be, or /embed
 *  URL. Returns null (never a guess) if the URL doesn't look like YouTube. */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const embedMatch = u.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function WatchAndLearn({
  url,
  title,
  source,
  note,
}: {
  url: string;
  title: string | null;
  source: string | null;
  note: string | null;
}) {
  const videoId = extractYouTubeId(url);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/[.08] px-5 py-4 sm:px-7">
        <p className="text-[11.5px] font-bold uppercase tracking-[.14em] text-electric-glow">
          Watch &amp; Learn
        </p>
      </div>

      {videoId ? (
        <div className="aspect-video w-full bg-navy-900">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={title ?? 'Related video'}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        // Extremely unlikely (every stored URL was verified as a youtube.com
        // link before being saved) but a thumbnail-card fallback keeps this
        // honest rather than silently failing to render anything.
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="grid aspect-video place-items-center bg-navy-900 text-[13px] text-silver-dim hover:text-white"
        >
          Watch on YouTube →
        </a>
      )}

      <div className="p-5 sm:p-7">
        {title && <h3 className="text-[16px] font-semibold leading-snug text-white sm:text-[17px]">{title}</h3>}
        {source && <p className="mt-1 text-[12.5px] font-semibold text-silver-dim">{source}</p>}
        {note && <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-silver">{note}</p>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-white/[.14] px-5 text-[13.5px] font-bold text-white transition-colors hover:border-electric hover:bg-electric/10"
        >
          Watch on YouTube
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </Card>
  );
}
