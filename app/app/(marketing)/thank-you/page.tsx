import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Thank You | Mindset Hockey',
  description: 'Thanks for reaching out to Mindset Hockey. We respond to all inquiries within 24 hours.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Thank You | Mindset Hockey',
    description: 'Thanks for reaching out to Mindset Hockey. We respond to all inquiries within 24 hours.',
    url: 'https://mindsethockey.com/thank-you',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Thank you' },
  ],
};

export default function ThankYou() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Thank you" />

      <section>
        <div className="faceoff" style={{ width: '520px', height: '520px', top: '-120px', left: '50%', marginLeft: '-260px' }} aria-hidden="true" />
        <div className="wrap-narrow center">
          <div style={{ width: '74px', height: '74px', borderRadius: '50%', background: 'rgba(61,220,132,.14)', border: '1px solid rgba(61,220,132,.4)', display: 'grid', placeItems: 'center', margin: '0 auto 26px' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
          </div>
          <p className="eyebrow center">Message received</p>
          <h1 style={{ fontSize: 'clamp(32px,6vw,60px)' }}>Thanks — we&apos;ve<br />got your message</h1>
          <p className="lede mt2" style={{ marginInline: 'auto' }}>
            A real person reads every inquiry. <span className="hl">We respond to all inquiries within 24 hours</span>,
            usually much sooner. Check your inbox — and your spam folder, just in case.
          </p>
          <p className="mt2"><span className="respond">⏱ Reply on the way within 24 hours</span></p>

          <div className="cards c3 mt3" style={{ textAlign: 'left' }}>
            <article className="card"><span className="num">01</span><h3>Start filming</h3><p>Side angle at hip height, ten feet away. Front angle at the same distance. Five shots of the same type, good light. That&apos;s what makes a real breakdown possible.</p></article>
            <article className="card"><span className="num">02</span><h3>Meet your coaches</h3><p>Two coaches, both current Jr hockey players. One of us owns the program; both of us coach it — and one of us will be working with your player.</p><p className="mt1 small"><Link href="/coaches">Meet the coaching staff →</Link></p></article>
            <article className="card"><span className="num">03</span><h3>Compare programs</h3><p>Standard, Premium and Custom side by side, so you know what to ask about on the call.</p><p className="mt1 small"><Link href="/pricing">See pricing →</Link></p></article>
          </div>

          <div className="contactstrip mt3">
            <div><h3>Need us sooner?</h3><p>If it&apos;s time-sensitive — a tryout or camp coming up — call and say so.</p></div>
            <div className="acts"><a className="btn btn-primary" href="tel:+12404356511" data-cta="call_from_thanks" data-cta-location="thank_you">Call (240) 435-6511</a><Link className="btn btn-ghost" href="/">Back to Home</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
