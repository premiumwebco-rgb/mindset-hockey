import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Hockey Training Pricing in Waldorf, MD | Membership & Custom Coaching | Mindset Hockey',
  description:
    'Mindset Hockey Membership is $49/month with full platform access — AI Shot Analysis, workout plans, nutrition, mindset training, video library and progress tracking. Custom Coaching available on request.',
  alternates: { canonical: 'https://mindsethockey.com/pricing' },
  openGraph: {
    title: 'Hockey Training Pricing & Programs | Mindset Hockey',
    description: 'One $49/month membership with full platform access, plus Custom Coaching built around your athlete.',
    url: 'https://mindsethockey.com/pricing',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image' },
};

// In-person / on-ice sessions are temporarily hidden platform-wide per a
// business decision to focus on the remote Membership + Custom Coaching
// model. The code below is intentionally kept, not deleted, so this can be
// restored by flipping this flag back to true.
const SHOW_IN_PERSON_SESSIONS = false;

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://mindsethockey.com/pricing' },
  ],
};

const SERVICE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Hockey development coaching',
  provider: { '@type': 'LocalBusiness', name: 'Mindset Hockey', '@id': 'https://mindsethockey.com/#business' },
  areaServed: [
    { '@type': 'City', name: 'Waldorf' },
    { '@type': 'AdministrativeArea', name: 'Charles County' },
    { '@type': 'AdministrativeArea', name: 'Southern Maryland' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Hockey Training Plans',
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'Mindset Hockey Membership',
        priceCurrency: 'USD',
        price: '49',
        description:
          '$49 per month, no setup fee. Full platform access: AI Shot Analysis, Workout Plans, Nutrition & Meal Plans, Mindset Training, Training Video Library and Progress Tracking.',
      },
      {
        '@type': 'Offer',
        name: 'Custom Coaching',
        priceCurrency: 'USD',
        description:
          'Personalized coaching package built from services including 1-on-1 online coaching, weekly check-ins, video reviews, direct messaging support and custom programming. Priced on request.',
      },
    ],
  },
};

export default function Pricing() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSONLD) }} />

      <Breadcrumbs current="Pricing" />

      <section style={{ paddingBottom: '36px' }}>
        <div className="faceoff" style={{ width: '460px', height: '460px', top: '-80px', right: '-140px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">Membership &amp; pricing</p>
            <h1>One plan.<br />Full access.</h1>
            <p className="lede mt2">
              Mindset Hockey Membership is $49/month — no setup fee, no tiers to compare. Want
              1-on-1 coaching, check-ins or a custom program on top of it? Request Custom Coaching
              and we&apos;ll build it around your athlete.
            </p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>

            <div className="mt3" style={{
              border: '1px solid rgba(61,220,132,.38)', background: 'rgba(61,220,132,.07)',
              borderRadius: '16px', padding: '20px 24px', maxWidth: '620px',
              marginLeft: 'auto', marginRight: 'auto',
            }}>
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--white)', fontSize: '18px' }}>
                New to Mindset Hockey? Get 3 AI Shot Analyses free.
              </p>
              <p className="mt1 muted" style={{ margin: '8px 0 0' }}>
                Create an account and upload a clip — no card needed. You&apos;ll get a breakdown of
                your shot mechanics across ten categories, with anything the footage can&apos;t
                support marked as such rather than guessed.
              </p>
              <p className="mt2" style={{ margin: '14px 0 0' }}>
                <Link className="btn btn-primary" href="/signup" data-cta="free_analyses" data-cta-location="pricing_hero">
                  Get 3 Free Analyses
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="plans" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="plan featured rv" id="membership">
              <span className="flag">Full platform access</span>
              <h3>Membership</h3>
              <p className="who">Everything non-coaching, for one monthly price.</p>
              <div className="price-monthly"><b>$49</b><span>/ month</span></div>
              <p className="price-note">No setup fee. No contract. Cancel any time.</p>
              <ul>
                <li>Full platform access</li>
                <li>AI Shot Analysis</li>
                <li>Workout Plans</li>
                <li>Nutrition &amp; Meal Plans</li>
                <li>Mindset Training</li>
                <li>Training Video Library</li>
                <li>Progress Tracking</li>
              </ul>
              <div className="foot">
                <Link className="btn btn-primary btn-block" href="/signup?plan=membership" data-plan="membership" data-cta="join_membership" data-cta-location="pricing_page">Join for $49/month</Link>
              </div>
            </article>

            <article className="plan rv" id="custom-coaching">
              <h3>Custom Coaching</h3>
              <p className="who">Built around a specific goal, timeline, tryout or team.</p>
              <div className="price-setup"><b>Quote</b><span>tailored to you</span></div>
              <div className="price-monthly" style={{ borderTopColor: 'transparent' }}><span>Priced after a short call</span></div>
              <p className="price-note">
                Select the services you&apos;re interested in and a coach will follow up with pricing
                and next steps.
              </p>
              <ul>
                <li>Personalized coaching</li>
                <li>Custom development plans</li>
                <li>1-on-1 coaching options</li>
                <li>Flexible pricing</li>
              </ul>
              <div className="foot">
                <Link className="btn btn-red btn-block" href="/coaching/request" data-plan="custom" data-cta="request_custom_plan" data-cta-location="pricing_page">Request Custom Plan</Link>
              </div>
            </article>
          </div>

          <p className="center mt3 muted" style={{ fontSize: '14.5px' }}>
            Weekly AI Shot Analysis allowances reset every 7 days. Additional single analyses at{' '}
            <b style={{ color: 'var(--white)' }}>$0.50 each</b> are coming soon — they&apos;ll never
            expire once purchased.
          </p>

          {SHOW_IN_PERSON_SESSIONS && (
            <div className="onice rv mt3" id="on-ice">
              <div className="onice-price">
                <p className="eyebrow">On-ice sessions</p>
                <b>$149</b>
                <span>per session</span>
              </div>
              <div className="onice-body">
                <h3>On-ice training at The Capital Clubhouse</h3>
                <p className="mt1"><span className="hl">No set time limit.</span> A session runs as long as it needs to — we don&apos;t watch a clock and cut a player off mid-rep.</p>
                <ul className="ticks mt1">
                  <li><b>Both coaches on the ice</b> when we&apos;re both available</li>
                  <li><b>Small groups on purpose</b> — we cap session size so every player gets real attention and real reps</li>
                  <li>Filmed on two angles, so the session doubles as your next video breakdown</li>
                  <li>Book on its own, or add it to Membership or a Custom Coaching plan</li>
                </ul>
                <p className="mt2">
                  <Link className="btn btn-primary" href="/contact?plan=on-ice" data-plan="on_ice" data-cta="book_on_ice" data-cta-location="pricing_page">Book an On-Ice Session</Link>{' '}
                  <a className="btn btn-ghost" href="tel:+12404356511" data-cta="call_on_ice" data-cta-location="pricing_page">Call to Check Availability</a>
                </p>
              </div>
            </div>
          )}

          <div className="founding rv mt3">
            <div className="founding-badge">Founding Member</div>
            <div>
              <h3>Lock in this rate for life</h3>
              <p className="mt1">
                The first athletes who join Mindset Hockey lock in their monthly membership rate for
                life. As the program grows, future pricing may increase — founding members keep their
                original monthly rate for as long as they stay.
              </p>
            </div>
          </div>

          <div className="contactstrip mt3 rv">
            <div>
              <h3>Not sure if Custom Coaching is right for you?</h3>
              <p>Tell us your player&apos;s age, level and what&apos;s frustrating you. We&apos;ll recommend the right setup — including telling you if Membership alone is all you need.</p>
            </div>
            <div className="acts">
              <Link className="btn btn-primary" href="/contact" data-cta="help_choosing" data-cta-location="pricing_page">Talk to a Coach</Link>
              <a className="btn btn-ghost" href="tel:+12404356511">Call Now</a>
            </div>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">What&apos;s included</p>
            <h2>Five systems, one membership</h2>
            <p className="lede mt2">
              Most players get skills coaching and nothing else. Membership is a comprehensive
              development system rather than just hockey training — every part reinforcing the
              others instead of competing for his week.
            </p>
          </div>
          <div className="cards c5 rv">
            <article className="card"><span className="num">01</span><h3>Skill development</h3><p>Shot mechanics, hands, edges and 1-on-1 play, coached against the 7-point rubric.</p></article>
            <article className="card"><span className="num">02</span><h3>Strength &amp; conditioning</h3><p>A specialized hockey workout plan built for his age, level and phase of the season.</p></article>
            <article className="card"><span className="num">03</span><h3>Nutrition</h3><p>A specialized hockey nutrition and meal plan — fueling practice, games and growth.</p></article>
            <article className="card"><span className="num">04</span><h3>AI Shot Analysis</h3><p>Scored breakdowns across ten mechanics categories, straight from a phone video.</p></article>
            <article className="card"><span className="num">05</span><h3>Mindset coaching</h3><p>Confidence, discipline, accountability and performance under pressure, coached on purpose.</p></article>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section id="mindset-development">
        <div className="crease" style={{ width: '340px', height: '170px', left: '-90px', top: '70px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Included with Membership</p>
            <h2>Mindset development<br />training</h2>
            <p className="lede mt2">
              Physical skills are only part of the equation. Every Membership athlete receives
              guidance on confidence, discipline, accountability and mental performance so they can
              perform at their best both on and off the ice.
            </p>
          </div>
          <div className="mindgrid rv">
            <div className="mind"><b>01</b><h3>Confidence building</h3><p>Confidence follows evidence. We build the evidence on purpose — tracked reps and scores that move.</p></div>
            <div className="mind"><b>02</b><h3>Mental toughness</h3><p>Finishing the shift, the session and the season when it stops being fun.</p></div>
            <div className="mind"><b>03</b><h3>Handling mistakes</h3><p>The 20-second reset, so one turnover doesn&apos;t become a bad game.</p></div>
            <div className="mind"><b>04</b><h3>Under pressure</h3><p>Tryouts, showcases and overtime. Focus cues that narrow attention to the next play.</p></div>
            <div className="mind"><b>05</b><h3>Goal setting</h3><p>Process goals he controls instead of outcome goals he doesn&apos;t.</p></div>
            <div className="mind"><b>06</b><h3>Accountability</h3><p>Owning the tape and the bad shift without spiraling. The biggest separator we see.</p></div>
            <div className="mind"><b>07</b><h3>Winning habits</h3><p>Sleep, fuel, stick work, film — what he does when nobody is watching.</p></div>
            <div className="mind"><b>08</b><h3>Discipline</h3><p>The same standard on low-motivation days, with systems that shrink the decision.</p></div>
            <div className="mind"><b>09</b><h3>Game preparation</h3><p>A repeatable pre-game routine so he arrives ready instead of hoping.</p></div>
            <div className="mind"><b>10</b><h3>Leadership</h3><p>Communicating with coaches and becoming the player used when it matters.</p></div>
          </div>
          <p className="center mt3">
            <Link className="btn btn-primary btn-lg" href="/signup?plan=membership" data-plan="membership" data-cta="membership_from_mindset" data-cta-location="pricing_mindset">Join for $49/month</Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap-narrow center">
          <p className="eyebrow center rv">For context</p>
          <h2 className="rv" style={{ fontSize: 'clamp(24px,4vw,40px)' }}>Cheaper than the lessons you already pay for</h2>
          <p className="lede mt2 rv" style={{ marginInline: 'auto' }}>
            A private skills coach runs $100–$150 an hour and sees your player twice a month.
            Membership is $49 a month and works with him every day — AI-graded film, a workout plan,
            nutrition and mindset coaching, not just cones.
          </p>
          <p className="mt2 rv"><Link className="btn btn-primary btn-lg" href="/contact" data-cta="pricing_final" data-cta-location="pricing_anchor">Book a Free Assessment</Link></p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Who you&apos;re paying for</p>
            <h2>Two coaches. Both<br />current Jr hockey players.</h2>
            <p className="lede mt2">
              Whichever plan you pick, your player works with one of these two — never a queue or an
              anonymous reviewer. One of us owns the program; both of us coach it.
            </p>
          </div>
          <div className="staff">
            <article className="coach lead rv">
              <div className="coach-photo">
                <span className="coach-badge">Coach &amp; Owner</span>
                <img src="/media/coach-brayden-headshot.jpg" alt="Coach Brayden Castiglia, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width={560} height={560} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Brayden Castiglia</h3>
                <p className="coach-role">Owner &amp; Lead Coach · Jr Hockey Player</p>
                <ul className="chips"><li>Jr Hockey Player</li><li>Program Founder</li><li>Lead Coach</li></ul>
                <p>Coach Brayden owns the business and built every system you&apos;re buying — the 7-point rubric, the six pillars and the mindset curriculum. Coaches players directly and answers every inquiry personally.</p>
              </div>
            </article>
            <article className="coach rv">
              <div className="coach-photo">
                <span className="coach-badge blue">Development Coach</span>
                <img src="/media/coach-jack-headshot.jpg" alt="Coach Jack Magill, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width={620} height={619} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Jack Magill</h3>
                <p className="coach-role">Development Coach · Jr Hockey Player</p>
                <ul className="chips"><li>Jr Hockey Player</li><li>NCAA Prospect</li><li>Player Mentor</li></ul>
                <p>Broke his collarbone and wrist at 16 playing Single-A, rebuilt his shot from scratch and reached the Jr hockey level by 20. Now exploring NCAA opportunities — and coaching the climb he&apos;s still on.</p>
              </div>
            </article>
          </div>
          <p className="center mt3"><Link className="btn btn-ghost" href="/coaches" data-cta="pricing_to_coaches" data-cta-location="pricing_staff">Meet the Coaching Staff</Link></p>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv"><p className="eyebrow center">Billing questions</p><h2>Pricing FAQ</h2></div>
          <div className="faq">
            {SHOW_IN_PERSON_SESSIONS && (
              <details open>
                <summary>How much is an on-ice session, and how long is it?</summary>
                <div className="ans">On-ice sessions are <b>$149 each</b> at The Capital Clubhouse in Waldorf. There&apos;s no set time limit — the session runs as long as it needs to rather than ending on a timer. When both coaches are available you get both of us on the ice, and we deliberately keep session sizes small so every player gets real attention and real reps instead of standing in a line.</div>
              </details>
            )}
            <details open>
              <summary>Is AI Shot Analysis included with Membership?</summary>
              <div className="ans">Yes. <b>AI Shot Analysis is included with Membership</b> — it&apos;s not a separate add-on. Upload a clip from your phone and it grades your shot against ten mechanics categories. To be straight with you about what it is: it reads still frames from your video the way a coach does stepping through film. It is not laboratory motion capture, it cannot measure joint angles or puck speed, and anything the footage does not clearly show comes back marked &quot;insufficient footage&quot; rather than guessed at. Every category carries a confidence level so you know how much weight to put on it.</div>
            </details>
            <details open><summary>Is there a setup fee?</summary><div className="ans">No. Membership is $49/month with no setup fee — you get full platform access starting the day you join.</div></details>
            <details><summary>Am I locked into a contract?</summary><div className="ans">No. Membership is month-to-month and you can cancel any time.</div></details>
            <details><summary>What&apos;s the difference between Membership and Custom Coaching?</summary><div className="ans">Membership ($49/mo) covers every non-coaching area of the platform — AI Shot Analysis, workouts, nutrition, mindset training, the video library and progress tracking. Custom Coaching is built on top of that for families who want direct coaching time: 1-on-1 sessions, weekly check-ins, video reviews, direct messaging or custom programming. <Link href="/coaching/request">Request a Custom Plan</Link> and a coach will follow up with pricing.</div></details>
            <details><summary>Do you offer sibling or team rates?</summary><div className="ans">Yes — both. <Link href="/coaching/request">Request a Custom Plan</Link> with the number of players and we&apos;ll price it properly.</div></details>
            <details><summary>What if it isn&apos;t a fit?</summary><div className="ans">Tell us within the first 14 days and we&apos;ll refund the monthly fee, no interrogation. We&apos;d rather have an honest conversation than an unhappy family.</div></details>
          </div>
        </div>
      </section>

      <section className="finale">
        <div className="wrap">
          <h2 className="rv">Ready when you are</h2>
          <p className="lede rv" style={{ maxWidth: '56ch' }}>Free assessment, honest answer, no pressure. If we&apos;re not the right fit we&apos;ll say so.</p>
          <div className="hero-actions rv" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" href="/contact" data-cta="final_cta" data-cta-location="pricing_finale">Book a Free Assessment</Link>
            <a className="btn btn-ghost btn-lg" href="tel:+12404356511">Call (240) 435-6511</a>
          </div>
        </div>
      </section>
    </>
  );
}
