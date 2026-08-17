import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hockey Training in Waldorf, MD | Shot Analysis & Mindset Coaching | Mindset Hockey',
  description:
    'Hockey training and player development in Waldorf, Maryland at The Capital Clubhouse. Shot mechanics breakdowns, strength, nutrition and mindset coaching for players 10–18. Free assessment — we reply within 24 hours.',
  alternates: { canonical: 'https://mindsethockey.com/' },
  openGraph: {
    title: 'Hockey Training in Waldorf, MD | Mindset Hockey',
    description:
      'Hockey development in Waldorf, Maryland, led by Coach Brayden. Shot mechanics, strength, nutrition, video analysis and mindset coaching for players 10–18.',
    url: 'https://mindsethockey.com/',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  other: {
    'geo.region': 'US-MD',
    'geo.placename': 'Waldorf, Maryland',
    'geo.position': '38.6284;-76.9310',
    ICBM: '38.6284, -76.9310',
  },
};

const BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'SportsActivityLocation'],
  '@id': 'https://mindsethockey.com/#business',
  name: 'Mindset Hockey',
  description:
    'Hockey training and player development in Waldorf, Maryland. Shot mechanics video analysis, strength and conditioning, nutrition and mindset development training for youth hockey players aged 10-18, based at The Capital Clubhouse.',
  url: 'https://mindsethockey.com/',
  logo: 'https://mindsethockey.com/assets/og-image.jpg',
  image: 'https://mindsethockey.com/assets/og-image.jpg',
  telephone: '+1-240-435-6511',
  email: 'braydencastiglia@gmail.com',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '3033 Waldorf Market Place',
    addressLocality: 'Waldorf',
    addressRegion: 'MD',
    postalCode: '20603',
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 38.6284, longitude: -76.931 },
  hasMap:
    'https://www.google.com/maps/search/?api=1&query=The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603',
  containedInPlace: { '@type': 'SportsActivityLocation', name: 'The Capital Clubhouse' },
  areaServed: [
    { '@type': 'City', name: 'Waldorf' },
    { '@type': 'City', name: 'White Plains' },
    { '@type': 'City', name: 'La Plata' },
    { '@type': 'City', name: 'Brandywine' },
    { '@type': 'AdministrativeArea', name: 'Charles County' },
    { '@type': 'AdministrativeArea', name: 'Southern Maryland' },
  ],
  knowsAbout: [
    'Youth hockey training',
    'Hockey shot mechanics',
    'Hockey strength and conditioning',
    'Hockey nutrition',
    'Mindset and mental performance coaching',
  ],
  employee: [
    {
      '@type': 'Person',
      jobTitle: 'Coach, Founder & Owner',
      name: 'Brayden Castiglia',
      description:
        'Coach, founder and owner of Mindset Hockey. Jr hockey player who owns the business and oversees all player development systems, program direction and coaching standards.',
    },
    {
      '@type': 'Person',
      jobTitle: 'Development Coach',
      name: 'Jack Magill',
      description: 'Jr hockey player and NCAA prospect. Skill development specialist and player mentor.',
    },
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '06:00',
      closes: '21:00',
    },
  ],
  sameAs: [
    'https://instagram.com/mindsethockey',
    'https://youtube.com/@mindsethockey',
    'https://tiktok.com/@mindsethockey',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Hockey Training Programs',
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'Standard Development Program',
        price: '249',
        priceCurrency: 'USD',
        description:
          '$249 one-time setup, then $100/month. Includes AI Shot Analysis, a personalized hockey development roadmap, hockey-specific workout plan, monthly progress review, goal setting and accountability, basic performance tracking, coaching support and member dashboard access.',
      },
      {
        '@type': 'Offer',
        name: 'Premium Development Program',
        price: '389',
        priceCurrency: 'USD',
        description:
          '$389 one-time setup, then $149/month. Everything in Standard — including AI Shot Analysis — plus a customized training program, performance nutrition guidance, video analysis and breakdowns, advanced performance tracking, mindset development training, priority support, personalized coaching guidance, monthly coaching review sessions and the premium resource library.',
      },
      {
        '@type': 'Offer',
        name: 'On-Ice Session',
        price: '149',
        priceCurrency: 'USD',
        description:
          '$149 per on-ice training session at The Capital Clubhouse in Waldorf, MD. Shooting development, stickhandling, skating work, hockey IQ, position-specific coaching and immediate feedback. Small session sizes for individual attention.',
      },
      {
        '@type': 'Offer',
        name: 'Custom Plan',
        description: 'A custom package built from Premium services and more, priced after a short call.',
      },
    ],
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What age players do you train?', acceptedAnswer: { '@type': 'Answer', text: 'Players aged 10 to 18. Under about 12 a parent should work through the plan alongside the player; from 13 up most players run it themselves.' } },
    { '@type': 'Question', name: 'Where do you train in Waldorf, Maryland?', acceptedAnswer: { '@type': 'Answer', text: 'All in-person sessions run at The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD 20603. It is our only training location, serving Waldorf, Charles County and Southern Maryland. Remote video coaching is available anywhere.' } },
    { '@type': 'Question', name: 'Will this get my son to Junior or college hockey?', acceptedAnswer: { '@type': 'Answer', text: 'No one can promise that, and anyone who does is not being straight with you. What we deliver is better shot mechanics, a real weekly plan, trained habits and a player who handles a bad game better.' } },
    { '@type': 'Question', name: 'How fast do you respond?', acceptedAnswer: { '@type': 'Answer', text: 'We respond to all inquiries within 24 hours.' } },
    { '@type': 'Question', name: 'How much is an on-ice hockey session in Waldorf, MD?', acceptedAnswer: { '@type': 'Answer', text: 'On-ice sessions are $149 each at The Capital Clubhouse in Waldorf, Maryland. There is no set time limit — a session runs as long as it needs to. When both coaches are available, both are on the ice, and session sizes are kept deliberately small so every player gets individual attention.' } },
    { '@type': 'Question', name: 'Who are the coaches?', acceptedAnswer: { '@type': 'Answer', text: 'Two coaches, both current Jr hockey players. The program is owned and led by Coach Brayden Castiglia, who sets the development systems and coaches players directly. He coaches alongside Coach Jack Magill, a Jr hockey player and NCAA prospect who works as a development coach, skill specialist and player mentor.' } },
    { '@type': 'Question', name: 'What is mindset development training?', acceptedAnswer: { '@type': 'Answer', text: 'Mindset development training is included with the Premium program. It covers confidence building, mental toughness, handling mistakes during games, performing under pressure, goal setting, accountability, winning habits, discipline and consistency, game preparation routines and leadership development.' } },
    { '@type': 'Question', name: "How do you analyze my player's shot?", acceptedAnswer: { '@type': 'Answer', text: 'You film two phone angles — side and front. Every submission is scored 1-10 against a 7-point mechanics rubric with timestamped notes, a coach voiceover and three prescribed drills.' } },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BUSINESS_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      {/* HERO */}
      <section className="hero">
        <div className="faceoff" style={{ width: '520px', height: '520px', top: '-120px', right: '-160px' }} />
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Hockey training · Waldorf, Maryland</p>
            <h1>
              <span className="show-desktop">Your kid isn&apos;t</span>
              <span className="show-desktop">short on effort.</span>
              <span className="accent show-desktop">He&apos;s short on a plan.</span>
              <span className="show-mobile">Train Smarter.</span>
              <span className="accent show-mobile">Play Better.</span>
            </h1>
            <p className="hero-sub lede show-desktop">
              I founded Mindset Hockey after going from a 16U A player with two broken ribs to an
              alternate captain, then AAA, then a signed Jr hockey contract. I own and run the program out
              of <b className="hl">The Capital Clubhouse in Waldorf, MD</b> — and I coach alongside Coach
              Jack. We&apos;re both coaches and both Jr hockey players; the difference is I own the business
              and set the system we both coach.
            </p>
            <p className="hero-sub lede show-mobile">
              AI shot analysis, structured training and mindset coaching — built for hockey players 10–18.
            </p>

            <div className="hero-actions show-desktop">
              <Link className="btn btn-primary btn-lg" href="/contact" data-cta="free_assessment" data-cta-location="hero">
                Book a Free Assessment
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/pricing" data-cta="view_pricing" data-cta-location="hero">
                See Programs &amp; Pricing
              </Link>
            </div>
            <div className="hero-actions show-mobile">
              <Link className="btn btn-primary btn-lg" href="/contact" data-cta="start_development" data-cta-location="hero_mobile">
                Start Your Development
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/programs" data-cta="explore_program" data-cta-location="hero_mobile">
                Explore the Program
              </Link>
            </div>

            <p className="hero-note"><span className="pulse" aria-hidden="true" /> We respond to all inquiries within 24 hours.</p>

            <div className="ladder">
              <b>16U A</b><i /><b>AAA</b><i /><b className="now">JR HOCKEY</b>
            </div>
          </div>

          <div className="duo">
            <figure className="hero-shot lead">
              <img src="/media/photo-faceoff.jpg" alt="Coach Brayden Castiglia, owner of Mindset Hockey, in a Team Maryland number 17 jersey lined up for a faceoff" width={1250} height={830} fetchPriority="high" />
              <figcaption>Coach Brayden Castiglia<em>Owner · Jr hockey player</em></figcaption>
            </figure>
            <figure className="hero-shot">
              <img src="/media/coach-jack-action.jpg" alt="Coach Jack Magill, Mindset Hockey development coach, wearing the captain's C in a Utica Jr. Comets game" width={628} height={630} fetchPriority="high" />
              <figcaption>Coach Jack Magill<em>Jr hockey player · Development Coach</em></figcaption>
            </figure>
            <p className="duo-note">Two coaches. Both Jr hockey players. I own and run the program.</p>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      {/* TRUST BAR */}
      <section className="band" style={{ paddingBlock: '38px' }}>
        <div className="wrap">
          <div className="cards c4">
            <div style={{ textAlign: 'center' }}>
              <p className="display" style={{ fontSize: '30px' }}>JR HOCKEY</p>
              <p className="small muted mt0">Signed player, coaching now</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className="display" style={{ fontSize: '30px' }}>7-POINT</p>
              <p className="small muted mt0">Shot mechanics rubric</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className="display" style={{ fontSize: '30px' }}>&lt;24 HRS</p>
              <p className="small muted mt0">Response to every inquiry</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className="display" style={{ fontSize: '30px' }}>WALDORF</p>
              <p className="small muted mt0">The Capital Clubhouse, MD</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section>
        <div className="wrap">
          <div className="head rv">
            <p className="eyebrow">The real problem</p>
            <h2>It&apos;s not effort.<br />It&apos;s not talent.</h2>
            <p className="lede mt2">
              Tier 2 families average around <span className="hl">$2,400 a season</span>. AAA families average
              closer to <span className="hl">$7,000</span>, and elite travel programs regularly pass $10,000.
              The money isn&apos;t the problem. Almost none of it goes toward the three things that actually
              move a player.
            </p>
          </div>
          <details className="acc">
            <summary className="acc-summary">See the three reasons</summary>
            <div className="acc-body">
              <div className="cards c3">
                <article className="card rv">
                  <span className="num">01</span>
                  <h3>No plan between sessions</h3>
                  <p>Team practice is 60 minutes of standing in lines. A private lesson is an hour twice a month. That leaves 167 hours a week with no structure and no idea what to work on next.</p>
                </article>
                <article className="card rv">
                  <span className="num">02</span>
                  <h3>No real feedback</h3>
                  <p>&quot;Compete harder.&quot; &quot;Want it more.&quot; Nobody can act on that. Your player has never had his shot broken down frame by frame and been told which mechanic is costing him velocity.</p>
                </article>
                <article className="card rv">
                  <span className="num">03</span>
                  <h3>Nobody coaches the mind</h3>
                  <p>He trains hard and still disappears after a bad shift. Confidence, bounce-back and composure are trainable skills — and in youth hockey almost nobody is teaching them.</p>
                </article>
              </div>
              <div className="contactstrip mt3 rv">
                <div>
                  <h3>Not sure which program fits?</h3>
                  <p>Tell us your player&apos;s age and level. We&apos;ll tell you honestly what we&apos;d work on first — even if the answer is &quot;not yet.&quot;</p>
                </div>
                <div className="acts">
                  <Link className="btn btn-primary" href="/contact" data-cta="talk_to_coach" data-cta-location="problem">Talk to a Coach</Link>
                  <a className="btn btn-ghost" href="tel:+12404356511">Call Now</a>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* SIX PILLARS */}
      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">The framework</p>
            <h2>The Six Pillars</h2>
            <p className="lede mt2">
              The system I used, in the order I used it. Every session, drill and weekly plan maps to
              exactly one pillar — so your player always knows what he&apos;s working on and why.
            </p>
          </div>
          <details className="acc">
          <summary className="acc-summary">See all six pillars</summary>
          <div className="acc-body">
          <div className="pillars">
            <article className="pillar rv"><span className="k">01</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 3a5 5 0 0 0-5 5c0 1.5.6 2.6 1.4 3.5.9 1 1.6 1.8 1.6 3.5v1h4v-1c0-1.7.7-2.5 1.6-3.5C16.4 10.6 17 9.5 17 8a5 5 0 0 0-5-5Z" /><path d="M10 20h4" /></svg></div>
              <h3>Mindset</h3><p>Confidence after a bad shift. Bounce-back protocols. Pre-game routine. Coming back from injury without losing yourself.</p>
            </article>
            <article className="pillar rv"><span className="k">02</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg></div>
              <h3>Mechanics</h3><p>The 7-point shot framework: weight transfer, stick flex, release timing, hands, follow through, balance and posture.</p>
            </article>
            <article className="pillar rv"><span className="k">03</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 17c4-1 6-4 8-8s4-6 8-6" /><circle cx="6" cy="18" r="2.4" /></svg></div>
              <h3>Skill</h3><p>Hands, edges, puck protection, deception and winning 1-on-1s. On-ice and off-ice progressions you can run at home.</p>
            </article>
            <article className="pillar rv"><span className="k">04</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg></div>
              <h3>Systems</h3><p>Weekly plans built around age, level and position. In-season versus off-season. When to push and when to recover.</p>
            </article>
            <article className="pillar rv"><span className="k">05</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 9a8 8 0 0 1 13.5-4L21 8" /><path d="M21 4v4h-4" /><path d="M20 15a8 8 0 0 1-13.5 4L3 16" /><path d="M3 20v-4h4" /></svg></div>
              <h3>Habits</h3><p>The daily standard. Practice structure. Game habits. The unglamorous consistency that separates improving from plateauing.</p>
            </article>
            <article className="pillar rv"><span className="k">06</span>
              <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FA9FF" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z" /><path d="M9.4 14 12 8.6l2.6 5.4M10.3 12.4h3.4" /></svg></div>
              <h3>Leadership</h3><p>Coachability, communication, and becoming the player a coach uses in the moments that matter. How I earned an &quot;A&quot;.</p>
            </article>
          </div>
          <p className="center mt3"><Link className="btn btn-ghost" href="/programs" data-cta="explore_programs" data-cta-location="pillars">Explore the Programs</Link></p>
          </div>
          </details>
        </div>
      </section>

      {/* SHOT ANALYSIS */}
      <section>
        <div className="crease" style={{ width: '340px', height: '170px', left: '-90px', bottom: '60px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head rv">
            <p className="eyebrow">The flagship service</p>
            <h2>Shot mechanics,<br />broken down 7 ways</h2>
            <p className="lede mt2">
              &quot;Shoot harder&quot; isn&apos;t coaching. Every shot is seven mechanics stacked on each other, and a
              slow shot is almost always one or two of them failing. Here&apos;s the exact framework every
              video review is scored against.
            </p>
          </div>

          <details className="acc">
          <summary className="acc-summary">See the full 7-point breakdown</summary>
          <div className="acc-body">
          <div className="rubric rv">
            <div className="rb"><b>POINT 01</b><h3>Weight Transfer</h3><p>Loading the back leg and driving through to the front. Hips lead the hands.</p></div>
            <div className="rb"><b>POINT 02</b><h3>Stick Flex</h3><p>Puck ahead of the blade, loading the shaft into the ice instead of slapping at it.</p></div>
            <div className="rb"><b>POINT 03</b><h3>Release Timing</h3><p>When the blade closes, and what he does before it. Goalies read telegraphed shots.</p></div>
            <div className="rb"><b>POINT 04</b><h3>Hand Positioning</h3><p>Bottom hand drives, top hand pulls. Separation changes with the shot type.</p></div>
            <div className="rb"><b>POINT 05</b><h3>Follow Through</h3><p>Where the blade finishes decides where the puck goes.</p></div>
            <div className="rb"><b>POINT 06</b><h3>Balance</h3><p>A stable base through the release. Falling away leaks the power he just loaded.</p></div>
            <div className="rb"><b>POINT 07</b><h3>Shooting Posture</h3><p>Athletic knee bend, chest up, shoulders square to intent.</p></div>
            <div className="rb" style={{ background: 'linear-gradient(160deg,#0E1E3C,#0A1428)' }}><b>THE OUTPUT</b><h3>A score out of 70</h3><p>Every submission returns a score per point, the two to fix first, and three drills that fix them.</p></div>
          </div>

          <div className="split mt3">
            <div className="rv">
              <p className="eyebrow">Real work, not a mock-up</p>
              <h3 style={{ fontSize: 'clamp(22px,3.4vw,32px)' }}>This is an actual scored release frame</h3>
              <p className="mt1">
                Filmed on a phone, rotated, stepped frame by frame, and graded against all seven points.
                Five of seven were gradeable from this footage — the other two were marked
                <em> n/a</em> rather than guessed at.
              </p>
              <ul className="ticks">
                <li>Timestamped notes on the exact frame the mechanic breaks</li>
                <li>Coach voiceover walking through every fix</li>
                <li>Three prescribed drills added to the weekly plan</li>
                <li>Re-film in 30 days and see both clips side by side</li>
              </ul>
              <p className="mt2"><Link className="btn btn-primary" href="/contact" data-cta="get_shot_analysis" data-cta-location="shot_section">Get Your Shot Analyzed</Link></p>
              <p className="mt2 small muted">
                <b className="hl">AI Shot Analysis is included with both Standard and Premium.</b>{' '}
                Upload a clip from your phone and get it graded against ten mechanics categories,
                with a confidence level on every one.
              </p>
            </div>
            <div className="rv">
              <figure className="sample">
                <img src="/media/release-annotated.jpg" alt="Annotated hockey shot release frame showing a deeply loaded stick shaft, the puck leaving the toe of the blade, a planted front foot and an airborne back leg" width={1280} height={720} loading="lazy" />
                <figcaption>A real release frame, scored — not a mock-up</figcaption>
              </figure>
              <div className="scorestrip">
                <div><b>9</b><span>Stick flex</span></div>
                <div><b>8</b><span>Weight transfer</span></div>
                <div className="low"><b>5</b><span>Release timing</span></div>
                <div><b>8</b><span>Follow through</span></div>
              </div>
            </div>
          </div>
          </div>
          </details>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      {/* FILM */}
      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">On the ice &amp; off it</p>
            <h2>Real film. Both coaches.</h2>
            <p className="lede mt2">
              Every frame you see actually happened — no interpolation, no invented frames. Two coaches,
              both current Jr hockey players, and the same film standard we hold your player&apos;s video to.
            </p>
          </div>

          <details className="acc">
          <summary className="acc-summary">Watch the film</summary>
          <div className="acc-body">
          <div className="compare rv">
            <div className="facade" data-lf-video="" data-video-src="/media/brayden-shot-slowmo.mp4" data-video-title="Coach Brayden game film — the shot, slowed at the release" role="button" tabIndex={0} aria-label="Play Coach Brayden's game film, slowed down through the shot">
              <span className="tag">Coach Brayden · slowed at the shot</span>
              <img src="/media/poster-brayden-shot.jpg" alt="Game film still showing Coach Brayden driving to the net before releasing a shot" width={1920} height={886} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Coach Brayden — full speed in, 0.25× through the release</div>
            </div>
            <div className="facade" data-lf-video="" data-video-src="/media/game-clip-1-action-slowmo.mp4" data-video-title="Coach Brayden game film — driving the zone" role="button" tabIndex={0} aria-label="Play Coach Brayden's game film driving the offensive zone at quarter speed">
              <span className="tag">0.25× · game film</span>
              <img src="/media/poster-clip-1.jpg" alt="Game film still showing Coach Brayden driving the offensive zone with a defender on his hip" width={1280} height={670} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Driving the zone — winning the inside lane</div>
            </div>
            <div className="facade" data-lf-video="" data-video-src="/media/coach-jack-clip-1.mp4" data-video-title="Coach Jack game film 1" role="button" tabIndex={0} aria-label="Play Coach Jack game film, clip one">
              <span className="tag">Coach Jack · game film</span>
              <img src="/media/poster-coach-clip-1.jpg" alt="Jr hockey game film still showing Coach Jack Magill circled as the play develops in the offensive zone" width={1172} height={540} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Coach Jack — reading the play and attacking the middle</div>
            </div>
            <div className="facade" data-lf-video="" data-video-src="/media/coach-jack-clip-2.mp4" data-video-title="Coach Jack game film 2" role="button" tabIndex={0} aria-label="Play Coach Jack game film, clip two">
              <span className="tag">Coach Jack · game film</span>
              <img src="/media/poster-coach-clip-2.jpg" alt="Jr hockey game film still showing a rush entering the offensive zone toward the net" width={1172} height={540} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Coach Jack — zone entry into a net-front finish</div>
            </div>
          </div>

          <div className="honestnote rv">
            <p>
              <span className="hl">Straight with you:</span> rink-cam game film like this is great for showing
              who we are, but it can&apos;t support a mechanics breakdown — at that distance a player is about
              forty pixels tall. That&apos;s why every analysis starts with a filming checklist, and why we&apos;ll
              tell you to refilm rather than guess at your son&apos;s shot. Anyone grading mechanics off
              LiveBarn is guessing.
            </p>
          </div>
          </div>
          </details>
        </div>
      </section>

      {/* COACHING STAFF */}
      <section id="coaching-staff">
        <div className="faceoff" style={{ width: '440px', height: '440px', top: '-60px', left: '-160px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">The coaching staff</p>
            <h2>Learn from coaches who<br />are still living the game</h2>
            <p className="lede mt2">
              Two coaches, both current Jr hockey players. Our staff combines leadership, experience and
              a passion for player development — helping athletes improve their skills, confidence and
              understanding of the game, on and off the ice.
            </p>
          </div>

          <details className="acc">
          <summary className="acc-summary">Meet Coach Brayden &amp; Coach Jack</summary>
          <div className="acc-body">
          <div className="staff">
            <article className="coach lead rv">
              <div className="coach-photo">
                <span className="coach-badge">Coach &amp; Owner</span>
                <img src="/media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width={560} height={560} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Brayden Castiglia</h3>
                <p className="coach-role">Owner &amp; Lead Coach · Jr Hockey Player</p>
                <ul className="chips">
                  <li>Jr Hockey Player</li><li>Program Founder</li><li>Business Owner</li><li>Lead Coach</li>
                </ul>
                <p>
                  I own and run Mindset Hockey. The seven-point rubric, the six-pillar framework and the
                  standard every coach here is held to are all mine — built out of my own climb from 16U A
                  to a signed Jr hockey contract, through two broken ribs.
                </p>
                <p>
                  I oversee every part of the program: operations, player development systems and the
                  direction of the business. I&apos;m also still on the ice and in the film room with players,
                  and I&apos;m the person who answers your first message personally.
                </p>
                <div className="foot">
                  <Link className="btn btn-red btn-block" href="/contact" data-cta="contact_founder" data-cta-location="home_staff">Talk to Coach Brayden</Link>
                </div>
              </div>
            </article>

            <article className="coach rv">
              <div className="coach-photo">
                <span className="coach-badge blue">Development Coach</span>
                <img src="/media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width={620} height={619} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Jack Magill</h3>
                <p className="coach-role">Development Coach · Jr Hockey Player</p>
                <ul className="chips">
                  <li>Jr Hockey Player</li><li>NCAA Prospect</li><li>Skill Specialist</li><li>Player Mentor</li>
                </ul>
                <p>
                  At 16, playing Single-A, Jack broke his collarbone and his wrist. Instead of letting the
                  setbacks define him he used them — rebuilding his shot from the ground up and going from
                  Single-A at 16 to competing at the Jr hockey level by 20. He&apos;s currently exploring NCAA
                  opportunities.
                </p>
                <p>
                  Because he&apos;s lived both the setbacks and the success, he coaches the whole player: the
                  skills on the ice, and the confidence, discipline and work ethic that decide how far
                  those skills go.
                </p>
                <div className="foot">
                  <Link className="btn btn-primary btn-block" href="/coaches" data-cta="meet_coach_jack" data-cta-location="home_staff">Read Coach Jack&apos;s Full Bio</Link>
                </div>
              </div>
            </article>
          </div>

          <p className="center mt3"><Link className="btn btn-ghost" href="/coaches" data-cta="view_staff" data-cta-location="home_staff">Meet the Full Coaching Staff</Link></p>
          </div>
          </details>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      {/* MINDSET DEVELOPMENT */}
      <section className="band" id="mindset-development">
        <div className="crease" style={{ width: '340px', height: '170px', right: '-90px', top: '70px' }} aria-hidden="true" />
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

          <details className="acc">
          <summary className="acc-summary">See all ten mindset topics</summary>
          <div className="acc-body">
          <div className="mindgrid rv">
            <div className="mind"><b>01</b><h3>Confidence building</h3><p>Confidence follows evidence. We build the evidence on purpose — tracked reps and scores that visibly move.</p></div>
            <div className="mind"><b>02</b><h3>Mental toughness</h3><p>Finishing the shift, the session and the season when it stops being fun. Trained through standards, not slogans.</p></div>
            <div className="mind"><b>03</b><h3>Handling mistakes</h3><p>The 20-second reset, so one turnover doesn&apos;t become four and a bad shift doesn&apos;t become a bad game.</p></div>
            <div className="mind"><b>04</b><h3>Under pressure</h3><p>Tryouts, showcases and playoff overtime. Breathing, focus cues and narrowing attention to the next play.</p></div>
            <div className="mind"><b>05</b><h3>Goal setting</h3><p>Process goals he controls instead of outcome goals he doesn&apos;t — reviewed monthly against real tracking.</p></div>
            <div className="mind"><b>06</b><h3>Accountability</h3><p>Owning the tape, the missed session and the bad shift without spiraling. The biggest separator we see.</p></div>
            <div className="mind"><b>07</b><h3>Winning habits</h3><p>The daily standard: sleep, fuel, stick work, film. What he does on the days nobody is watching.</p></div>
            <div className="mind"><b>08</b><h3>Discipline</h3><p>Showing up at the same level on low-motivation days, with systems that make the choice smaller.</p></div>
            <div className="mind"><b>09</b><h3>Game preparation</h3><p>A repeatable pre-game routine so he arrives ready instead of hoping he feels it that morning.</p></div>
            <div className="mind"><b>10</b><h3>Leadership</h3><p>Communicating with coaches and becoming the player used in the moments that actually matter.</p></div>
          </div>

          <div className="honestnote rv">
            <p>
              <span className="hl">Why this is coached and not assumed:</span> Coach Brayden lost most of two
              seasons to broken ribs, and Coach Jack broke his collarbone and wrist at 16. Both
              came back further along than they left. Neither of those comebacks was a physical story —
              which is exactly why hockey success here means developing the athlete <em>and</em> the person.
            </p>
          </div>

          <p className="center mt3">
            <Link className="btn btn-primary btn-lg" href="/pricing#premium" data-plan="premium" data-cta="mindset_to_premium" data-cta-location="home_mindset">Mindset Training Comes With Premium</Link>
          </p>
          </div>
          </details>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      {/* CASE STUDIES */}
      <section>
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Player development</p>
            <h2>Success stories</h2>
            <p className="lede mt2">
              The first case study is Coach Brayden&apos;s own — documented frame by frame, because it&apos;s the one
              we can prove today. Player case studies get added here as members hit their 30-day re-films.
            </p>
          </div>

          <details className="acc">
          <summary className="acc-summary">Read both case studies</summary>
          <div className="acc-body">
          <div className="cards c2">
            <article className="case rv">
              <div className="case-head"><p>Case study 01 · Coach Brayden</p></div>
              <div className="case-body">
                <h3>16U A to a signed Jr hockey contract</h3>
                <p className="mt1 muted">
                  Two broken ribs cost most of two seasons. The comeback wasn&apos;t more talent — it was
                  rebuilding shot mechanics frame by frame and training the mental side nobody was
                  coaching. Result: trusted in key moments, named alternate captain, moved to AAA, signed
                  to play Jr hockey.
                </p>
                <div className="case-metrics">
                  <div><b>2</b><span>Seasons lost to injury</span></div>
                  <div><b>A→AAA</b><span>Level jump</span></div>
                  <div><b>&quot;A&quot;</b><span>Alternate captain</span></div>
                </div>
              </div>
            </article>

            <article className="case rv">
              <div className="case-head"><p>Case study 02 · Shot rebuild</p></div>
              <div className="case-body">
                <h3>Elite flex, slow release — the real diagnosis</h3>
                <p className="mt1 muted">
                  A full 7-point breakdown found stick flex at 9/10 and weight transfer at 8/10 — but
                  release timing at 5/10, with a 0.8-second puck drag before release. The fix wasn&apos;t a
                  harder shot. It was a shorter runway. That&apos;s the kind of finding that changes what a
                  player trains for the next 30 days.
                </p>
                <div className="case-metrics">
                  <div><b>9/10</b><span>Stick flex</span></div>
                  <div><b>5/10</b><span>Release timing</span></div>
                  <div><b>0.8s</b><span>Drag before release</span></div>
                </div>
              </div>
            </article>
          </div>
          </div>
          </details>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Programs</p>
            <h2>Three ways to work together</h2>
            <p className="lede mt2">Setup fee covers the intake assessment, baseline video breakdown and your first custom plan. Monthly keeps the coaching going. Premium is the complete system — skill development, strength and conditioning, nutrition, video analysis and mindset coaching in one program.</p>
          </div>
          <div className="plans">
            <article className="plan rv">
              <h3>Standard</h3>
              <p className="who">Build the foundation for long-term hockey development.</p>
              <div className="price-setup"><b>$249</b><span>one-time setup</span></div>
              <div className="price-monthly"><b>$100</b><span>/ month</span></div>
              <p className="price-note">Cancel the monthly any time.</p>
              <ul>
                <li><b className="hl">AI Shot Analysis</b></li>
                <li>Personalized development roadmap</li>
                <li>Hockey-specific workout plan</li>
                <li>Monthly progress review</li>
                <li>Goal setting and accountability</li>
                <li>Member dashboard access</li>
              </ul>
              <div className="foot"><Link className="btn btn-ghost btn-block" href="/pricing#basic" data-plan="basic" data-cta="plan_basic" data-cta-location="home_pricing">See What&apos;s Included</Link></div>
            </article>

            <article className="plan featured rv">
              <span className="flag">⭐ Most Popular</span>
              <h3>Premium</h3>
              <p className="who">Everything serious athletes need to reach the next level.</p>
              <div className="price-setup"><b>$389</b><span>one-time setup</span></div>
              <div className="price-monthly"><b>$149</b><span>/ month</span></div>
              <p className="price-note">Everything in Standard, including AI Shot Analysis, plus:</p>
              <ul>
                <li>Customized training program that evolves as the athlete progresses</li>
                <li>Performance nutrition guidance tailored to the athlete&apos;s goals</li>
                <li>Video analysis and breakdowns</li>
                <li>Advanced performance tracking</li>
                <li><b className="hl">Mindset development training</b></li>
                <li>Monthly coaching review sessions</li>
                <li>Priority support</li>
              </ul>
              <div className="foot"><Link className="btn btn-primary btn-block" href="/pricing#premium" data-plan="premium" data-cta="plan_premium" data-cta-location="home_pricing">See What&apos;s Included</Link></div>
            </article>

            <article className="plan rv">
              <h3>Custom</h3>
              <p className="who">Built around a specific goal, timeline or tryout.</p>
              <div className="price-setup"><b>Quote</b><span>tailored to you</span></div>
              <div className="price-monthly" style={{ borderTopColor: 'transparent' }}><span>Priced after a short call</span></div>
              <p className="price-note">Need something tailored specifically to your goals?</p>
              <ul>
                <li>Pick the services you want from Premium — and more</li>
                <li>Built around your player&apos;s schedule and season</li>
                <li>Team and association packages available</li>
              </ul>
              <div className="foot"><Link className="btn btn-red btn-block" href="/contact?plan=custom" data-plan="custom" data-cta="request_custom_quote" data-cta-location="home_pricing">Request Custom Quote</Link></div>
            </article>
          </div>
          <div className="onice rv mt3" id="on-ice">
            <div className="onice-price">
              <p className="eyebrow">On-ice sessions</p>
              <b>$149</b>
              <span>per session</span>
            </div>
            <div className="onice-body">
              <h3>Private On-Ice Session</h3>
              <p className="mt1">
                <span className="hl">No set time limit.</span> A session runs as long as it needs to — we&apos;re
                not watching a clock and cutting your player off mid-rep.
              </p>
              <ul className="ticks mt1">
                <li>Shooting development, stickhandling and skating work</li>
                <li>Hockey IQ and position-specific coaching</li>
                <li>Immediate feedback, on the ice, in the moment</li>
                <li><b>Both coaches on the ice</b> when we&apos;re both available</li>
                <li><b>Small groups on purpose</b> — every player gets real attention and real reps</li>
                <li>Book on its own, or add it to any program</li>
              </ul>
              <p className="mt2">
                <Link className="btn btn-primary" href="/contact?plan=on-ice" data-plan="on_ice" data-cta="book_on_ice" data-cta-location="home_pricing">Book a Private Session</Link>{' '}
                <a className="btn btn-ghost" href="tel:+12404356511" data-cta="call_on_ice" data-cta-location="home_pricing">Call to Check Availability</a>
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

          <p className="center mt3"><Link className="btn btn-ghost" href="/pricing" data-cta="full_pricing" data-cta-location="home_pricing">Compare all three in detail</Link></p>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Straight answers</p>
            <h2>Hockey training FAQ</h2>
          </div>
          <details className="acc">
          <summary className="acc-summary">See all FAQ</summary>
          <div className="acc-body">
          <div className="faq">
            <details open>
              <summary>What age players do you train?</summary>
              <div className="ans">Ages 10 to 18. Below about 12, a parent should work through the plan alongside the player — the drills are simple but the mindset lessons land better with a conversation attached. From 13 up, most players run it themselves, and honestly that&apos;s part of the point.</div>
            </details>
            <details>
              <summary>What is AI Shot Analysis, and which plan includes it?</summary>
              <div className="ans"><b>It is included with both Standard and Premium</b> — every member gets it. You film a few shots on your phone, upload the clip, and it grades your mechanics across ten categories with notes on what it actually saw. Being straight with you about the limits: it reads still frames from your video, the same way a coach does stepping through film. It is not a biomechanics lab, it cannot measure joint angles or puck velocity, and anything your footage does not clearly show comes back marked &quot;insufficient footage&quot; instead of guessed at. Every score carries a confidence level, and a low-confidence read is a starting point for a conversation with a coach — not a verdict.</div>
            </details>
            <details>
              <summary>How much is an on-ice session?</summary>
              <div className="ans"><b>$149 per session</b>, on the ice at The Capital Clubhouse in Waldorf. There&apos;s no set time limit — a session runs as long as it needs to instead of ending on a clock. When we&apos;re both available you get both coaches on the ice, and we keep session sizes small on purpose so every player gets real attention and real reps. <a href="#on-ice">Details here</a>.</div>
            </details>
            <details>
              <summary>Where in Waldorf, Maryland do you train?</summary>
              <div className="ans">All in-person sessions run at <b>The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD 20603</b> — our only training location. It&apos;s just off Route 301, with free on-site parking, and it serves families across Waldorf, White Plains, La Plata, Brandywine, Charles County and the wider Southern Maryland area. <Link href="/locations">Directions and details here</Link>.</div>
            </details>
            <details>
              <summary>Do we have to travel to you?</summary>
              <div className="ans">Only if you want in-person ice time. The core of the program — video analysis, the weekly plan and mindset work — is built to run remotely, so families outside Southern Maryland get the same system without the drive.</div>
            </details>
            <details>
              <summary>Who will actually be coaching my player?</summary>
              <div className="ans">One of two named coaches, never an anonymous reviewer. We&apos;re both coaches and both current Jr hockey players — the difference is that one of us owns the business and sets the system we both coach. Coach Brayden Castiglia works with players directly, alongside Coach Jack Magill, our development coach, skill specialist and NCAA prospect. <Link href="/coaches">Meet them both here</Link>.</div>
            </details>
            <details>
              <summary>What is mindset development training?</summary>
              <div className="ans">It&apos;s the mental side of the game, coached deliberately rather than left to chance — confidence building, mental toughness, handling mistakes mid-game, performing under pressure, goal setting, accountability, winning habits, discipline, game preparation routines and leadership. It&apos;s included with the <Link href="/pricing#premium">Premium program</Link>.</div>
            </details>
            <details>
              <summary>Will this get my son to Junior or college hockey?</summary>
              <div className="ans">No one can promise that, and anyone who does isn&apos;t being straight with you. Fewer than 0.11% of youth players reach the NHL, and Junior and college spots are genuinely scarce. What we do promise: better shot mechanics, a real weekly plan, trained habits, and a player who handles a bad game better. Those are the things inside your control.</div>
            </details>
            <details>
              <summary>He already has a skills coach. Is this redundant?</summary>
              <div className="ans">The opposite. Your skills coach gets him for an hour, twice a month. This is what he does the other twenty-nine days — and it means he shows up to that lesson already knowing which two mechanics he&apos;s working on. It makes money you already spend go further.</div>
            </details>
            <details>
              <summary>What do we need to film a video analysis?</summary>
              <div className="ans">A phone. Two angles — one from the side at about hip height, one from the front, roughly ten feet away, with his whole body in frame. Five shots minimum of the same type. There&apos;s a walkthrough in your onboarding, and if the footage isn&apos;t usable we&apos;ll tell you exactly what to change at no charge.</div>
            </details>
            <details>
              <summary>How quickly do you respond?</summary>
              <div className="ans">We respond to all inquiries within 24 hours. Premium members get priority support and video breakdowns returned inside 72 hours — most come back in under 48.</div>
            </details>
            <details>
              <summary>Does this work for defencemen and goalies?</summary>
              <div className="ans">Mindset, Systems, Habits and Leadership apply to every position — four of the Six Pillars. Shot mechanics content covers forwards and defencemen, including a separate point-shot module. Goalie-specific technical coaching isn&apos;t offered yet, so if he&apos;s a goalie, know what you&apos;re getting.</div>
            </details>
            <details>
              <summary>Can our team or association work with you?</summary>
              <div className="ans">Yes. Team and association packages are quoted per roster and include a live mindset session with the team. <Link href="/contact?plan=custom">Request a custom quote</Link> with your roster size and level.</div>
            </details>
          </div>
          </div>
          </details>
        </div>
      </section>

      {/* LOCATION */}
      <section className="band">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <p className="eyebrow">Our home rink</p>
              <h2 style={{ fontSize: 'clamp(26px,4vw,42px)' }}>Hockey training in<br />Waldorf, Maryland</h2>
              <p className="lede mt2">
                Every in-person session runs out of one rink — The Capital Clubhouse in Waldorf. One home
                base means a consistent schedule, familiar ice, and no chasing coaches around the state.
              </p>
              <div className="venue mt2">
                <p className="vname">The Capital Clubhouse</p>
                <address>3033 Waldorf Market Place<br />Waldorf, MD 20603</address>
                <div className="vmeta">
                  <div><b>Serving</b><span>Waldorf, White Plains, La Plata, Brandywine, Charles County &amp; Southern Maryland</span></div>
                  <div><b>Hours</b><span>Mon–Sun, 6:00am–9:00pm ET, by appointment</span></div>
                  <div><b>Contact</b><span><a href="tel:+12404356511">(240) 435-6511</a></span></div>
                </div>
              </div>
              <p className="mt2">
                <a className="btn btn-primary" href="https://www.google.com/maps/dir/?api=1&destination=The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603" target="_blank" rel="noopener" data-cta="get_directions" data-cta-location="home_location">Get Directions</a>{' '}
                <Link className="btn btn-ghost" href="/locations" data-cta="view_locations" data-cta-location="home_location">Location Details</Link>
              </p>
            </div>
            <div className="mapwrap rv">
              <iframe
                title="Map showing The Capital Clubhouse at 3033 Waldorf Market Place, Waldorf, Maryland"
                src="https://maps.google.com/maps?q=The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603&t=&z=15&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="finale">
        <div className="wrap">
          <p className="eyebrow center rv">The whole idea</p>
          <h2 className="rv">Talent helps. Mindset changes careers.</h2>
          <p className="lede rv" style={{ maxWidth: '58ch' }}>
            Tell us your player&apos;s age, level and what&apos;s frustrating you. We&apos;ll come back within 24 hours
            with an honest read on what to work on first.
          </p>
          <div className="hero-actions rv" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" href="/contact" data-cta="final_cta" data-cta-location="finale">Book a Free Assessment</Link>
            <a className="btn btn-ghost btn-lg" href="tel:+12404356511">Call (240) 435-6511</a>
          </div>
          <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>
        </div>
      </section>
    </>
  );
}
