'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/* ==========================================================================
   Re-runs the marketing site's per-page behavior after each navigation.

   WHY THIS EXISTS
   site.js is a plain IIFE written for a static site, where every page load
   re-ran it. Under the App Router it is loaded once by <Script> and never
   executes again — so after a client-side navigation the new page's `.rv`
   elements are never picked up by the reveal observer. Since site.css sets
   `.rv { opacity: 0 }`, that left the whole page body invisible while the
   layout's header and footer (never `.rv`) kept rendering.

   site.js now exposes `window.mhInitPage()`, which re-binds only the
   page-scoped behavior: the reveal observer, forms and video facades. It is
   idempotent — already-bound elements are skipped — so calling it on every
   route change is safe.

   The retry loop covers the first paint, when the layout may mount before the
   afterInteractive script has finished loading.
   ========================================================================== */

declare global {
  interface Window {
    mhInitPage?: () => void;
  }
}

export default function MarketingScripts() {
  const pathname = usePathname();

  useEffect(() => {
    // site.js redirects to `thank-you.html` on the static site. Inside Next.js
    // the route is extensionless, so tell it where to go.
    document.body.setAttribute('data-thanks-url', '/thank-you');

    let cancelled = false;
    let attempts = 0;

    function tryInit() {
      if (cancelled) return;
      if (typeof window.mhInitPage === 'function') {
        window.mhInitPage();
        return;
      }
      // Script not parsed yet — retry briefly, then give up gracefully.
      if (attempts++ < 20) {
        setTimeout(tryInit, 100);
        return;
      }
      // Last-resort safety net: if site.js never loads at all, reveal the
      // content anyway. An un-animated page beats an invisible one.
      document.querySelectorAll('.rv:not(.in)').forEach((el) => el.classList.add('in'));
    }

    // rAF so the new page's DOM is committed before we query it.
    const raf = requestAnimationFrame(tryInit);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
