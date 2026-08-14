import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Service | Mindset Hockey',
  description:
    'The terms covering Mindset Hockey coaching memberships — what you are buying, how billing works, and how to cancel.',
  alternates: { canonical: 'https://mindsethockey.com/terms' },
  openGraph: {
    title: 'Terms of Service | Mindset Hockey',
    description:
      'The terms covering Mindset Hockey coaching memberships — what you are buying, how billing works, and how to cancel.',
    url: 'https://mindsethockey.com/terms',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Terms of Service' },
  ],
};

export default function Terms() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Terms of Service" />

      <section>
        <div className="wrap-narrow">
          <p className="eyebrow">Legal</p>
          <h1>Terms of Service</h1>
          <p className="lede mt2">
            Short version: we sell hockey coaching and training. We do not sell outcomes, and you can
            cancel the monthly membership yourself at any time.
          </p>
          <p className="small muted">Last updated: August 2026</p>

          <div className="mt3">
            <h2 style={{ fontSize: '22px' }}>Who we are</h2>
            <p className="mt1 muted">
              Mindset Hockey provides in-person and remote hockey coaching and player development for
              players aged 10–18. In-person sessions run at The Capital Clubhouse, 3033 Waldorf Market
              Place, Waldorf, MD 20603. Contact:{' '}
              <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> or (240) 435-6511.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>What you are buying</h2>
            <p className="mt1 muted">
              A coaching membership. The Standard program includes AI Shot Analysis, a personalized
              development roadmap, a hockey-specific workout plan, monthly progress review, goal setting
              and accountability, basic performance tracking, coaching support and member dashboard
              access. The Premium program includes everything in Standard plus a customized training
              program, performance nutrition guidance, video analysis and breakdowns, advanced
              performance tracking, mindset development training, priority support, personalized
              coaching guidance and monthly coaching review sessions.
            </p>
            <p className="mt1 muted">
              You are not buying tryout results, roster spots, scouting exposure, or placement at any
              level of hockey. Nobody can honestly sell you those.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Pricing and billing</h2>
            <p className="mt1 muted">
              Standard is a <b>$249 one-time setup fee</b> plus <b>$100 per month</b>. Premium is a{' '}
              <b>$389 one-time setup fee</b> plus <b>$149 per month</b>. Private on-ice sessions are{' '}
              <b>$149 per session</b> and are booked and paid for separately from any membership. All
              prices are in US dollars.
            </p>
            <p className="mt1 muted">
              The setup fee is charged once, at the start, together with your first month. Your first
              payment is therefore $349 for Standard or $538 for Premium. The monthly fee then renews
              automatically each month until you cancel. Payments are processed by Stripe; we never see
              or store your card details.
            </p>
            <p className="mt1 muted">
              We may change prices for new members at any time. If we change the price of an existing
              membership we will tell you before it takes effect, and you can cancel if you do not want
              to continue. Members who joined under the Founding Member offer keep their original
              monthly rate for as long as their membership stays active.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Cancellation and refunds</h2>
            <p className="mt1 muted">
              You can cancel the monthly membership yourself at any time from Account &amp; Billing in
              your member dashboard. Your access continues to the end of the period you have already
              paid for, and you are not charged again after that.
            </p>
            <p className="mt1 muted">
              The setup fee is non-refundable once onboarding has begun, because it pays for work that
              is delivered immediately — the intake assessment, your baseline breakdown and your first
              custom plan. Monthly fees already paid are not refunded on a partial-month basis. Full
              detail is in our <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>No performance guarantees</h2>
            <p className="mt1 muted">
              Individual results vary and depend on the player, their coaching, their team, their health
              and a large amount of luck. We will always tell you the truth about what training can and
              cannot do rather than sell you a dream. No program can guarantee placement at any level of
              hockey.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>AI Shot Analysis — what it is</h2>
            <p className="mt1 muted">
              AI Shot Analysis reads still frames from the video you upload, the way a coach does
              stepping through film, and grades shot mechanics across a set of categories. It is not a
              biomechanics lab: it cannot measure joint angles, puck velocity or force, and it does not
              claim to. Anything the footage cannot support is reported as insufficient footage rather
              than a guessed number. If the model cannot read a clip, the video is kept and routed to a
              human coach for review. It never invents a score.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Accounts and minors</h2>
            <p className="mt1 muted">
              Accounts for players under 18 must be created and managed by a parent or legal guardian.
              The guardian is the account holder and is responsible for billing and for any content
              uploaded. Keep your password to yourself; you are responsible for activity on your account.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Video you upload</h2>
            <p className="mt1 muted">
              You keep ownership of any video you submit. You grant us the limited right to store it,
              review it and produce feedback for you. Video is stored privately and is visible only to
              you and the reviewing coach. We will never publish, market or share a player&apos;s footage
              without separate written consent from their parent or guardian. You can request deletion of
              any submission at any time.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Content licence</h2>
            <p className="mt1 muted">
              Your membership is a personal, non-transferable licence to view the content. Please do not
              redistribute, resell or re-upload it. Team and association licences are available — just{' '}
              <Link href="/contact?plan=custom">ask</Link>.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Acceptable use</h2>
            <p className="mt1 muted">
              We may suspend or end a membership for abusive behavior toward coaches or other members,
              sharing account access, redistributing content, or attempting to interfere with the
              service. If we end your membership for one of these reasons we will refund any unused
              portion of the current month.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Safety</h2>
            <p className="mt1 muted">
              Training carries physical risk. Nothing here is medical advice. If your player is injured
              or in pain, see a doctor before continuing, and follow their guidance over ours.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Changes to these terms</h2>
            <p className="mt1 muted">
              If we change these terms we will update the date at the top of this page. If a change
              materially affects what you are paying for, we will tell active members by email before it
              takes effect.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Governing law</h2>
            <p className="mt1 muted">
              These terms are governed by the laws of the State of Maryland, USA.
            </p>

            <h2 className="mt3" style={{ fontSize: '22px' }}>Contact</h2>
            <p className="mt1 muted">
              Questions about these terms:{' '}
              <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a> or (240) 435-6511.
              See also our <Link href="/privacy">Privacy Policy</Link> and{' '}
              <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
