import Script from 'next/script';
import Nav from '@/components/marketing/Nav';
import Footer from '@/components/marketing/Footer';
import StickyCta from '@/components/marketing/StickyCta';
import MarketingScripts from '@/components/marketing/MarketingScripts';

/**
 * Marketing route group — the finished 10-page static site, ported into
 * Next.js so /login, /signup and the dashboard share one origin (and one
 * cookie domain) with the Supabase-authenticated portal in (app).
 *
 * Deliberately loads the ORIGINAL site.css/site.js as public assets rather
 * than rewriting the design in Tailwind: this is the only way to guarantee
 * pixel-for-pixel fidelity to the approved design. Because this stylesheet
 * is only linked from this layout, it's only present in the DOM while on a
 * marketing route — Next unmounts it automatically when navigating into
 * (app), so it can never bleed into the portal's Tailwind styling.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Same Google Fonts URL the static site used — next/font's scoped
          font variables (used by the portal) don't resolve the literal
          'Anton'/'Inter' family names site.css references. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/assets/site.css" />

      {/* site.css hides `.rv` blocks until the reveal observer adds `.in`.
          With JS unavailable that observer never runs, so — exactly as the
          original static pages did — force everything visible. Content must
          never depend on JavaScript to exist. */}
      <noscript>
        <style>{`.rv{opacity:1!important;transform:none!important}.stickycta{display:none}`}</style>
      </noscript>

      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
      <StickyCta />

      <Script src="/assets/site.js" strategy="afterInteractive" />
      {/* Re-binds page-scoped behavior after every client-side navigation. */}
      <MarketingScripts />
    </>
  );
}
