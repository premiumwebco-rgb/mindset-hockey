import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Hockey Training Pricing in Waldorf, MD | Standard, Premium & Custom | Mindset Hockey',
  description:
    'Hockey training in Waldorf, MD: on-ice sessions $149, Standard $249 + $100/month, Premium $389 + $149/month with video analysis, nutrition and mindset development training.',
  alternates: { canonical: 'https://mindsethockey.com/pricing' },
  openGraph: {
    title: 'Hockey Training Pricing & Programs | Mindset Hockey',
    description: 'Standard, Premium and Custom hockey development plans in Waldorf, MD. Transparent pricing, no contracts, 24-hour response.',
    url: 'https://mindsethockey.com/pricing',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image' },
};

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
      { '@type': 'Offer', name: 'Standard Development Program', priceCurrency: 'USD', price: '249', description: '$249 one-time setup fee, then $100 per month. Includes AI Shot Analysis, a personalized hockey development roadmap, hockey-specific workout plan, monthly progress review, goal setting and accountability, basic performance tracking, coaching support and member dashboard access.' },
      { '@type': 'Offer', name: 'Premium Development Program', priceCurrency: 'USD', price: '389', description: '$389 one-time setup fee, then $149 per month. Everything in Standard — including AI Shot Analysis — plus a customized training program, performance nutrition guidance, video analysis and breakdowns, advanced performance tracking, mindset development training, priority support, personalized coaching guidance, monthly coaching review sessions and the premium resource library.' },
      { '@type': 'Offer', name: 'On-Ice Session', priceCurrency: 'USD', price: '149', description: '$149 per on-ice training session at The Capital Clubhouse in Waldorf, MD. Shooting development, stickhandling, skating work, hockey IQ, position-specific coaching and immediate feedback. Small session sizes so every player gets individual attention.' },
      { '@type': 'Offer', name: 'Custom Plan', priceCurrency: 'USD', description: 'Custom package built from Premium services and more. Priced on request.' },
    ],
  },
};

const COMPARE_ROWS = [
  { feature: 'Development roadmap', standard: '✓', premium: '✓' },
  { feature: 'Monthly check-ins', standard: '✓', premium: '✓' },
  { feature: 'Performance tracking', standard: 'Basic', premium: 'Advanced' },
  { feature: 'Access to training resources', standard: '✓', premium: '✓' },
  { feature: 'AI Shot Analysis', standard: '✓', premium: '✓' },
  { feature: 'Hockey workout plan', standard: '✓', premium: '✓' },
  { feature: 'Performance nutrition guidance', standard: '—', premium: '✓' },
  { feature: 'Video analysis & breakdowns', standard: '—', premium: '✓' },
  { feature: 'Priority support', standard: '—', premium: '✓' },
  { feature: 'Monthly coaching review sessions', standard: '—', premium: '✓' },
  { feature: 'Mindset development training', standard: '—', premium: '✓' },
  { feature: 'Setup fee', standard: '$249', premium: '$389', neutral: true },
  { feature: 'Monthly', standard: '$100', premium: '$149', neutral: true },
];

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
            <p className="eyebrow center">Programs &amp; pricing</p>
            <h1>Pick the level<br />he&apos;s actually at</h1>
            <p className="lede mt2">
              Every plan starts with a one-time setup fee that covers the intake assessment, your
              player&apos;s baseline video breakdown and the first custom plan. The monthly fee keeps the
              coaching, tracking and check-ins running.
            </p>
            <p className="mt2 muted">
              In-person sessions run at <Link href="/locations">The Capital Clubhouse, 3033 Waldorf
              Market Place, Waldorf, MD</Link>. Remote coaching is available anywhere.
            </p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>

            {/* Acquisition offer. Deliberately factual — no accuracy or
                improvement claims, matching the honesty of the analysis itself. */}
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
          <div className="plans">
            <article className="plan rv" id="basic">
              <h3>Standard</h3>
              <p className="who">Build the foundation for long-term hockey development.</p>
              <div className="price-setup"><b>$249</b><span>one-time setup</span></div>
              <div className="price-monthly"><b>$100</b><span>/ month</span></div>
              <p className="price-note">No contract. Cancel the monthly any time.</p>
              <ul>
                <li><b style={{ color: 'var(--white)' }}>10 AI Shot Analyses per week</b></li>
                <li>Hockey-specific workout plan</li>
                <li>Personalized development roadmap</li>
                <li>Monthly progress review</li>
                <li>Goal setting and accountability</li>
                <li>Basic performance tracking</li>
                <li>Coaching support</li>
                <li>Member dashboard access</li>
              </ul>
              <div className="foot">
                <Link className="btn btn-ghost btn-block" href="/signup?plan=standard" data-plan="standard" data-cta="start_basic" data-cta-location="pricing_page">Get Started</Link>
              </div>
            </article>

            <article className="plan featured rv" id="premium">
              <span className="flag">⭐ Most Popular</span>
              <h3>Premium</h3>
              <p className="who">Everything serious athletes need to reach the next level.</p>
              <div className="price-setup"><b>$389</b><span>one-time setup</span></div>
              <div className="price-monthly"><b>$149</b><span>/ month</span></div>
              <p className="price-note">No contract. Cancel the monthly any time.</p>
              <ul>
                <li><b style={{ color: 'var(--white)' }}>20 AI Shot Analyses per week</b></li>
                <li className="head">Everything in Standard, plus</li>
                <li>Customized training program that evolves as the athlete progresses</li>
                <li>Performance nutrition guidance tailored to the athlete&apos;s goals</li>
                <li>Video analysis and breakdowns</li>
                <li>Advanced performance tracking</li>
                <li><b style={{ color: 'var(--white)' }}>Mindset development training</b></li>
                <li>Priority support</li>
                <li>Personalized coaching guidance</li>
                <li>Monthly coaching review sessions</li>
                <li>Premium resource library</li>
              </ul>
              <div className="foot">
                <Link className="btn btn-primary btn-block" href="/signup?plan=premium" data-plan="premium" data-cta="start_premium" data-cta-location="pricing_page">Get Started</Link>
              </div>
            </article>

            <article className="plan rv" id="custom">
              <h3>Custom</h3>
              <p className="who">Built around a specific goal, timeline, tryout or team.</p>
              <div className="price-setup"><b>Quote</b><span>tailored to you</span></div>
              <div className="price-monthly" style={{ borderTopColor: 'transparent' }}><span>Priced after a short call</span></div>
              <p className="price-note">
                Need something tailored specifically to your goals? Build a custom package by selecting
                the services you want from our Premium offerings and more. Contact us for a personalized
                quote.
              </p>
              <ul>
                <li>Choose the services that matter to your player</li>
                <li>Built around your season and schedule</li>
                <li>Tryout, showcase and camp preparation</li>
                <li>Team and association packages</li>
              </ul>
              <div className="foot">
                <Link className="btn btn-red btn-block" href="/contact?plan=custom" data-plan="custom" data-cta="request_custom_quote" data-cta-location="pricing_page">Request Custom Quote</Link>
              </div>
            </article>
          </div>

          <p className="center mt3 muted" style={{ fontSize: '14.5px' }}>
            Weekly allowances reset every 7 days. Additional single analyses at{' '}
            <b style={{ color: 'var(--white)' }}>$0.50 each</b> are coming soon — they&apos;ll never
            expire once purchased.
          </p>

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
                <li>Book on its own, or add it to any Basic, Premium or Custom plan</li>
              </ul>
              <p className="mt2">
                <Link className="btn btn-primary" href="/contact?plan=on-ice" data-plan="on_ice" data-cta="book_on_ice" data-cta-location="pricing_page">Book an On-Ice Session</Link>{' '}
                <a className="btn btn-ghost" href="tel:+12404356511" data-cta="call_on_ice" data-cta-location="pricing_page">Call to Check Availability</a>
              </p>
            </div>
          </div>

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
              <h3>Not sure which one?</h3>
              <p>Tell us your player&apos;s age, level and what&apos;s frustrating you. We&apos;ll recommend the right plan — including telling you if you don&apos;t need us yet.</p>
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
            <p className="eyebrow center">Side by side</p>
            <h2>What&apos;s in each plan</h2>
          </div>
          <div className="rubric rv" style={{ gridTemplateColumns: '1fr' }}>
            <div className="rb" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center', background: 'var(--navy-700)' }}>
              <b style={{ margin: 0, color: 'var(--white)' }}>FEATURE</b>
              <b style={{ margin: 0, textAlign: 'center', color: 'var(--white)' }}>STANDARD</b>
              <b style={{ margin: 0, textAlign: 'center', color: 'var(--electric-glow)' }}>PREMIUM</b>
            </div>
            {COMPARE_ROWS.map((row) => (
              <div key={row.feature} className="rb" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <p style={{ color: 'var(--silver)' }}>{row.feature}</p>
                <p style={{ textAlign: 'center', color: row.neutral ? 'var(--white)' : 'var(--electric-glow)' }}>{row.standard}</p>
                <p style={{ textAlign: 'center', color: row.neutral ? 'var(--white)' : 'var(--electric-glow)' }}>{row.premium}</p>
              </div>
            ))}
          </div>
          <p className="center mt2 small muted">
            Looking for something in between, or a team rate?{' '}
            <Link href="/contact?plan=custom" data-plan="custom" data-cta="custom_from_table" data-cta-location="pricing_table">Request a custom quote</Link>.
          </p>

          <div className="head center rv mt3" style={{ paddingTop: '30px' }}>
            <p className="eyebrow center">What Premium really buys</p>
            <h2>Five systems, one program</h2>
            <p className="lede mt2">
              Most players get skills coaching and nothing else. Premium is a comprehensive development
              system rather than just hockey training — every part reinforcing the others instead of
              competing for his week.
            </p>
          </div>
          <div className="cards c5 rv">
            <article className="card"><span className="num">01</span><h3>Skill development</h3><p>Shot mechanics, hands, edges and 1-on-1 play, coached against the 7-point rubric.</p></article>
            <article className="card"><span className="num">02</span><h3>Strength &amp; conditioning</h3><p>A specialized hockey workout plan built for his age, level and phase of the season.</p></article>
            <article className="card"><span className="num">03</span><h3>Nutrition</h3><p>A specialized hockey nutrition and meal plan — fueling practice, games and growth.</p></article>
            <article className="card"><span className="num">04</span><h3>Video analysis</h3><p>Scored breakdowns with timestamped notes, coach voiceover and prescribed drills.</p></article>
            <article className="card"><span className="num">05</span><h3>Mindset coaching</h3><p>Confidence, discipline, accountability and performance under pressure, coached on purpose.</p></article>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section id="mindset-development">
        <div className="crease" style={{ width: '340px', height: '170px', left: '-90px', top: '70px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Included with Premium</p>
            <h2>Mindset development<br />training</h2>
            <p className="lede mt2">
              Physical skills are only part of the equation. Our Premium athletes receive guidance on
              confidence, discipline, accountability and mental performance so they can perform at their
              best both on and off the ice.
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
            <Link className="btn btn-primary btn-lg" href="/signup?plan=premium" data-plan="premium" data-cta="premium_from_mindset" data-cta-location="pricing_mindset">Start Premium — $389 + $149/mo</Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap-narrow center">
          <p className="eyebrow center rv">For context</p>
          <h2 className="rv" style={{ fontSize: 'clamp(24px,4vw,40px)' }}>Cheaper than the lessons you already pay for</h2>
          <p className="lede mt2 rv" style={{ marginInline: 'auto' }}>
            A private skills coach runs $100–$150 an hour and sees your player twice a month. Premium is
            $149 a month and works with him every day — with a coach reviewing his film, not just running
            him through cones.
          </p>
          <p className="mt2 rv"><Link className="btn btn-primary btn-lg" href="/contact" data-cta="pricing_final" data-cta-location="pricing_anchor">Book a Free Assessment</Link></p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Who you&apos;re paying for</p>
            <h2>Two coaches. Both<br />playing Junior A.</h2>
            <p className="lede mt2">
              Whichever plan you pick, your player works with one of these two — never a queue or an
              anonymous reviewer. One of us owns the program; both of us coach it.
            </p>
          </div>
          <div className="staff">
            <article className="coach lead rv">
              <div className="coach-photo">
                <span className="coach-badge">Coach &amp; Owner</span>
                <img src="/media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width={560} height={560} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Brayden</h3>
                <p className="coach-role">Owner &amp; Lead Coach · Junior A Player</p>
                <ul className="chips"><li>Junior A Player</li><li>Program Founder</li><li>Lead Coach</li></ul>
                <p>Coach Brayden owns the business and built every system you&apos;re buying — the 7-point rubric, the six pillars and the mindset curriculum. Coaches players directly and answers every inquiry personally.</p>
              </div>
            </article>
            <article className="coach rv">
              <div className="coach-photo">
                <span className="coach-badge blue">Development Coach</span>
                <img src="/media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width={620} height={619} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Jack</h3>
                <p className="coach-role">Development Coach · Junior A Player</p>
                <ul className="chips"><li>Junior A Player</li><li>NCAA Prospect</li><li>Player Mentor</li></ul>
                <p>Broke his collarbone and wrist at 16 playing Single-A, rebuilt his shot from scratch and reached Junior A by 20. Now exploring NCAA opportunities — and coaching the climb he&apos;s still on.</p>
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
            <details open>
              <summary>How much is an on-ice session, and how long is it?</summary>
              <div className="ans">On-ice sessions are <b>$149 each</b> at The Capital Clubhouse in Waldorf. There&apos;s no set time limit — the session runs as long as it needs to rather than ending on a timer. When both coaches are available you get both of us on the ice, and we deliberately keep session sizes small so every player gets real attention and real reps instead of standing in a line.</div>
            </details>
            <details open>
              <summary>Is AI Shot Analysis included with both plans?</summary>
              <div className="ans">Yes. <b>AI Shot Analysis is included with both the Standard and Premium programs</b> — it is not a Premium-only feature. Upload a clip from your phone and it grades your shot against ten mechanics categories. To be straight with you about what it is: it reads still frames from your video the way a coach does stepping through film. It is not laboratory motion capture, it cannot measure joint angles or puck speed, and anything the footage does not clearly show comes back marked &quot;insufficient footage&quot; rather than guessed at. Every category carries a confidence level so you know how much weight to put on it.</div>
            </details>
            <details><summary>What does the setup fee cover?</summary><div className="ans">The intake assessment, your player&apos;s baseline video breakdown scored against all seven mechanics points, and building the first custom training plan. It&apos;s the heaviest work of the whole engagement and it happens once.</div></details>
            <details><summary>Am I locked into a contract?</summary><div className="ans">No. The monthly is month-to-month and you can cancel any time. The setup fee is one-time and non-recurring.</div></details>
            <details><summary>Can I switch plans later?</summary><div className="ans">Yes. Moving from Basic to Premium only costs the difference in setup fees, not a second full setup.</div></details>
            <details><summary>Do you offer sibling or team rates?</summary><div className="ans">Yes — both. <Link href="/contact?plan=custom">Request a custom quote</Link> with the number of players and we&apos;ll price it properly.</div></details>
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
