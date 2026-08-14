import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | Mindset Hockey',
  description:
    'How to cancel a Mindset Hockey membership, what happens to your access, and which charges are refundable.',
  alternates: { canonical: 'https://mindsethockey.com/refunds' },
  openGraph: {
    title: 'Cancellation & Refund Policy | Mindset Hockey',
    description:
      'How to cancel a Mindset Hockey membership, what happens to your access, and which charges are refundable.',
    url: 'https://mindsethockey.com/refunds',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Cancellation & Refund Policy' },
  ],
};

export default function Refunds() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Cancellation & Refund Policy" />

      <section>
        <div className="wrap-narrow">
          <p className="eyebrow">Legal</p>
          <h1>Cancellation &amp; Refund Policy</h1>
          <p className="lede mt2">
            No contract and no cancellation fee. You cancel the monthly membership yourself, in your own
            account, whenever you want.
          </p>
          <p className="small muted">Last updated: August 2026</p>

          <div className="mt3">
            <h2 style={{ fontSize: '22px' }}>How to cancel</h2>
            <p className="mt1 muted">
              Log in, open <b>Account &amp; Billing</b>, and click <b>Manage Billing</b>. That opens the
              secure Stripe billing portal where you can cancel the monthly membership immediately. You
              do not need to email or call us, and nobody will try to talk you out of it.
            </p>
            <p className="mt1 muted">
              If you would rather we did it for you, email{' '}
              <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> or call
              (240) 435-6511 and we will cancel it the same day.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>What happens when you cancel</h2>
            <p className="mt1 muted">
              Your membership stays active until the end of the month you have already paid for. You keep
              full access for that time. After that the membership does not renew and you are not charged
              again. We do not pro-rate or refund the remainder of a month that has already started.
            </p>
            <p className="mt1 muted">
              Your account and your uploaded video are not deleted when you cancel. You can log back in
              and resubscribe later, or ask us to delete your data — see our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>The setup fee</h2>
            <p className="mt1 muted">
              The one-time setup fee — $249 on Standard, $389 on Premium — is <b>non-refundable once
              onboarding has begun</b>. It pays for work that is delivered up front and cannot be
              un-delivered: the intake assessment, the baseline breakdown of your player&apos;s shot, and
              building the first custom plan.
            </p>
            <p className="mt1 muted">
              If you pay and then change your mind <b>before</b> that onboarding work has started, email
              us and we will refund the setup fee in full. Just tell us promptly.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Monthly fees</h2>
            <p className="mt1 muted">
              Monthly fees already charged are non-refundable, because the coaching, plan updates and
              reviews for that month are provided as the month runs. Cancelling stops all future charges.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Private on-ice sessions</h2>
            <p className="mt1 muted">
              Private on-ice sessions are $149 each and are paid for separately. Reschedule or cancel with
              at least 24 hours&apos; notice and the session is moved or refunded in full. Under 24 hours,
              or a no-show, and the session is used — the ice time and the coach&apos;s time are already
              committed. Illness and genuine emergencies are handled reasonably; just tell us.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>If something goes wrong</h2>
            <p className="mt1 muted">
              If you were charged in error, charged twice, or charged after cancelling, email{' '}
              <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> with the date and
              amount. We will investigate and refund a genuine billing error in full — that is not a
              discretionary decision on our part.
            </p>
            <p className="mt1 muted">
              Please contact us before opening a dispute with your bank. A dispute takes weeks to resolve;
              an email to us usually takes hours.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>If we end a membership</h2>
            <p className="mt1 muted">
              If we end your membership for a reason set out in our <Link href="/terms">Terms of
              Service</Link> — abusive behavior, sharing account access, redistributing content — we
              refund the unused portion of the current month.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Contact</h2>
            <p className="mt1 muted">
              Billing questions: <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a>{' '}
              or (240) 435-6511. We answer every message personally.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
