'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* ==========================================================================
   SIGNED-URL-AWARE MEDIA

   Wraps a <video>/<img> whose `src` is a short-lived Supabase signed URL
   (minted server-side, once, when the page rendered). Two independent mobile
   failure modes land here identically — a decode failure (unsupported
   container/codec) and an expired signature (the tab sat backgrounded past
   the URL's TTL) — and this component tells them apart with one retry:

     1st error  -> router.refresh(). The server component re-runs, mints a
                   FRESH signed URL, and this element receives a new `src`.
                   If the failure was expiry, this silently fixes it.
     2nd error  -> the retry used a brand-new URL and still failed, so this is
                   not an expiry problem. Render an honest fallback instead of
                   a permanently blank box: a message plus a direct link to
                   the same signed URL, which most mobile OSes will still let
                   a user open/save even when the inline <video> element can't
                   decode it.

   No new API route, no client-side Supabase call, no change to how or by whom
   the URL was authorized — this only reacts to the URL already handed to it.

   ROOT-CAUSE NOTE (mobile video playback): per the HTML5 media spec, setting
   `src` on a <video> element that has already started loading (or already
   errored) does NOT by itself make the browser attempt the new source —
   nothing restarts the resource-selection algorithm without an explicit
   `.load()` call or a full element remount. Without that, the 1st-error ->
   router.refresh() retry above minted a fresh signed URL but the still-
   mounted, still-broken <video> DOM node just sat there, so a member never
   actually saw the fresh URL attempted. `key={src}` below forces React to
   tear down and recreate the <video> element whenever src changes (mount,
   or after a refresh), guaranteeing a clean load attempt every time — this
   is the fix, not a behavior change to the retry logic itself. Expired
   signed URLs from a backgrounded mobile tab are the case this matters for
   most: mobile is where a session actually sits past the TTL and hits this
   retry path, so this bug reads as "video doesn't load on mobile" even
   though the missing-reload defect itself isn't mobile-specific.
   ========================================================================== */

interface SmartVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  fallbackLabel?: string;
}

export function SmartVideo({ src, fallbackLabel = 'video', className, ...rest }: SmartVideoProps) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);
  const [broken, setBroken] = useState(false);

  function handleError() {
    if (!retried) {
      setRetried(true);
      router.refresh();
      return;
    }
    setBroken(true);
  }

  if (broken) {
    return <MediaFallback label={fallbackLabel} href={src} className={className} />;
  }

  return (
    <video
      key={src}
      {...rest}
      src={src}
      onError={handleError}
      preload="metadata"
      className={className}
    />
  );
}

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackLabel?: string;
}

export function SmartImage({ src, fallbackLabel = 'image', className, alt, ...rest }: SmartImageProps) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);
  const [broken, setBroken] = useState(false);

  function handleError() {
    if (!retried) {
      setRetried(true);
      router.refresh();
      return;
    }
    setBroken(true);
  }

  if (broken) {
    return <MediaFallback label={fallbackLabel} href={src} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} src={src} alt={alt} onError={handleError} className={className} />;
}

function MediaFallback({
  label,
  href,
  className,
}: {
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <div
      className={`grid place-items-center gap-3 border border-dashed border-white/[.14] bg-navy-900/60 p-8 text-center ${className ?? ''}`}
    >
      <p className="text-[13.5px] text-silver-dim">
        This {label} can&apos;t play directly in your browser.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-[10px] border border-white/[.16] px-4 py-2 text-[13px] font-semibold text-white hover:border-electric"
      >
        Open the original file
      </a>
    </div>
  );
}
