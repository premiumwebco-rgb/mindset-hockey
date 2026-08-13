import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy | Mindset Hockey',
  description:
    'How Mindset Hockey collects, uses and protects your information — with extra care because most of the people we coach are children.',
  alternates: { canonical: 'https://mindsethockey.com/privacy' },
  openGraph: {
    title: 'Privacy Policy | Mindset Hockey',
    description:
      'How Mindset Hockey collects, uses and protects your information — with extra care because most of the people we coach are children.',
    url: 'https://mindsethockey.com/privacy',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Privacy Policy' },
  ],
};

export default function Privacy() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Privacy Policy" />

      <section>
        <div className="wrap-narrow">
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="lede mt2">We collect the minimum needed to run the coaching service, and we&apos;re especially careful because most of the people we work with are children.</p>
          <p className="small muted">Last updated: August 2026</p>

          <div className="mt3">
            <h2 style={{ fontSize: '22px' }}>What we collect</h2>
            <p className="mt1 muted">Contact details you give us (name, email, phone), player profile details (first name, age, level, position), any video you submit for analysis, and standard technical data such as device type and pages viewed via Google Analytics.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Children</h2>
            <p className="mt1 muted">Accounts and inquiries are made by a parent or guardian. We deliberately do not collect a child&apos;s full name, home address, phone number, school or precise location. If you believe we hold information about a child that we shouldn&apos;t, email <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> and we&apos;ll delete it.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Video you submit</h2>
            <p className="mt1 muted">Submitted video is stored privately and is visible only to you and the reviewing coach. It is never used in marketing without separate written consent from a parent or guardian. You can request deletion of any submission at any time.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Analytics and cookies</h2>
            <p className="mt1 muted">We use Google Analytics to understand which pages are useful and where people get stuck. It sets cookies and collects usage data. You can opt out with Google&apos;s browser add-on or by blocking cookies in your browser — the site works fine either way.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Who we share with</h2>
            <p className="mt1 muted">Only the providers needed to run the service: our website host, email provider, analytics provider and payment processor. We do not sell personal information and we do not share it with advertisers or data brokers.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Your rights</h2>
            <p className="mt1 muted">You can request a copy of your data, correct it, or have it deleted. Email us and we&apos;ll action it promptly.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Email</h2>
            <p className="mt1 muted">We send service email (replies, scheduling, breakdown notifications) to everyone who contacts us, and marketing email only to people who opted in. Every marketing email has a working one-click unsubscribe.</p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Contact</h2>
            <p className="mt1 muted">Questions about this policy: <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> or (240) 435-6511.</p>
          </div>
        </div>
      </section>
    </>
  );
}
