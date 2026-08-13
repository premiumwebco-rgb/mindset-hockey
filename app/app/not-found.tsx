import Link from 'next/link';
import Script from 'next/script';
import Nav from '@/components/marketing/Nav';
import Footer from '@/components/marketing/Footer';
import StickyCta from '@/components/marketing/StickyCta';

/**
 * Root 404 — catches any URL that doesn't match a route anywhere in the app
 * (marketing or portal). It sits outside the (marketing) route group, so
 * Next won't wrap it in that layout automatically; it renders its own
 * Nav/Footer/site.css the same way (marketing)/layout.tsx does, so a broken
 * link still lands on the finished site's design rather than a bare page.
 */
export const metadata = {
  title: 'Page Not Found | Mindset Hockey',
  description: "That page doesn't exist. Head back to Mindset Hockey to find hockey training programs, pricing and shot analysis.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/assets/site.css" />

      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <section>
          <div className="faceoff" style={{ width: '520px', height: '520px', top: '-100px', left: '50%', marginLeft: '-260px' }} aria-hidden="true" />
          <div className="wrap-narrow center">
            <p className="display" style={{ fontSize: 'clamp(70px,18vw,150px)', color: 'var(--rink-red)', lineHeight: '.9' }}>404</p>
            <p className="eyebrow center mt2">Icing the puck</p>
            <h1 style={{ fontSize: 'clamp(28px,5vw,48px)' }}>That page went<br />off the boards</h1>
            <p className="lede mt2" style={{ marginInline: 'auto' }}>The link&apos;s broken or the page moved. Here&apos;s where most people were heading:</p>
            <div className="cards c3 mt3" style={{ textAlign: 'left' }}>
              <article className="card"><h3>Programs</h3><p className="mt1">Shot analysis, mindset coaching and the full six-pillar system.</p><p className="mt1 small"><Link href="/programs">See programs →</Link></p></article>
              <article className="card"><h3>Coaching staff</h3><p className="mt1">Meet Coach Brayden and our Junior A development coach.</p><p className="mt1 small"><Link href="/coaches">Meet the coaches →</Link></p></article>
              <article className="card"><h3>Free assessment</h3><p className="mt1">Tell us about your player and get an honest recommendation.</p><p className="mt1 small"><Link href="/contact">Get started →</Link></p></article>
            </div>
            <p className="mt3"><Link className="btn btn-primary btn-lg" href="/" data-cta="404_home" data-cta-location="404">Back to Home</Link></p>
          </div>
        </section>
      </main>
      <Footer />
      <StickyCta />

      <Script src="/assets/site.js" strategy="afterInteractive" />
    </>
  );
}
