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
    { '@type': 'Question', name: 'Who is Mindset Hockey for?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey players ages 10 to 18 who want structure between practices — shot mechanics, a real weekly plan and mindset coaching. Below about 12, a parent should work through the plan alongside the player; from 13 up, most players run it themselves.' } },
    { '@type': 'Question', name: 'What does the program include?', acceptedAnswer: { '@type': 'Answer', text: 'Standard includes AI Shot Analysis, a personalized development roadmap, a hockey-specific workout plan, monthly progress review, goal setting and dashboard access. Premium adds performance nutrition guidance, video breakdowns, mindset development training and priority support.' } },
    { '@type': 'Question', name: 'Do you offer in-person and remote training?', acceptedAnswer: { '@type': 'Answer', text: 'Both. In-person ice time runs at The Capital Clubhouse in Waldorf, MD. The core of the program — video analysis, the weekly plan and mindset work — is built to run remotely.' } },
    { '@type': 'Question', name: 'Where are in-person sessions held?', acceptedAnswer: { '@type': 'Answer', text: 'All in-person sessions run at The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD 20603 — our only training location.' } },
    { '@type': 'Question', name: 'How does AI Shot Analysis work?', acceptedAnswer: { '@type': 'Answer', text: 'You film a few shots on your phone and upload the clip. It grades your mechanics across ten categories with notes on what it actually saw and a confidence level on every score. Anything the footage does not clearly show comes back marked insufficient footage instead of guessed at.' } },
    { '@type': 'Question', name: 'What makes Mindset Hockey different?', acceptedAnswer: { '@type': 'Answer', text: 'One of two named coaches works with your player directly, both current Jr hockey players. The program combines shot mechanics, a structured weekly plan and mindset coaching in one system.' } },
    { '@type': 'Question', name: 'How do I get started?', acceptedAnswer: { '@type': 'Answer', text: 'Book a free assessment and tell us your player’s age and level. We respond to every inquiry within 24 hours.' } },
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

            {/* Large, unmissable Member Login CTA — visible above the fold on
                phones without scrolling, styled distinctly (outline, not
                filled) so it never competes with the primary "Start Your
                Development" CTA above it. Links straight to the existing
                /login page — no new auth flow. */}
            <div className="hero-actions" style={{ marginTop: '10px' }}>
              <Link
                className="btn btn-login btn-lg btn-block"
                href="/login"
                data-cta="member_login"
                data-cta-location="hero"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20c1.3-3.8 4.2-5.7 7-5.7s5.7 1.9 7 5.7" />
                </svg>
                Member Login
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

          <details className="acc" open>
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
              <div className="foot"><Link className="btn btn-ghost btn-block" href="/pricing#basic" data-plan="basic" data-cta="plan_basic" data-cta-location="home_pricing"><span className="show-desktop">See What&apos;s Included</span><span className="show-mobile">View Plan</span></Link></div>
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
              <div className="foot"><Link className="btn btn-primary btn-block" href="/pricing#premium" data-plan="premium" data-cta="plan_premium" data-cta-location="home_pricing"><span className="show-desktop">See What&apos;s Included</span><span className="show-mobile">View Plan</span></Link></div>
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
            <p className="eyebrow center">Straight Answers</p>
            <h2>Hockey Training FAQ</h2>
          </div>
          <div className="faq">
            <details open>
              <summary>Who is Mindset Hockey for?</summary>
              <div className="ans">Hockey players ages 10 to 18 who want structure between practices — shot mechanics, a real weekly plan and mindset coaching, not just an hour twice a month. Below about 12, a parent should work through the plan alongside the player; from 13 up, most players run it themselves.</div>
            </details>
            <details>
              <summary>What does the program include?</summary>
              <div className="ans">Standard includes AI Shot Analysis, a personalized development roadmap, a hockey-specific workout plan, monthly progress review, goal setting and dashboard access. Premium adds performance nutrition guidance, video breakdowns, mindset development training and priority support. On-ice sessions at The Capital Clubhouse are available separately. <Link href="/pricing">Full pricing here</Link>.</div>
            </details>
            <details>
              <summary>Do you offer in-person and remote training?</summary>
              <div className="ans">Both. In-person ice time runs at The Capital Clubhouse in Waldorf, MD. The core of the program — video analysis, the weekly plan and mindset work — is built to run remotely, so families outside Southern Maryland get the same system without the drive.</div>
            </details>
            <details>
              <summary>Where are in-person sessions held?</summary>
              <div className="ans">All in-person sessions run at <b>The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD 20603</b> — our only training location. <Link href="/locations">Directions and details here</Link>.</div>
            </details>
            <details>
              <summary>How does AI Shot Analysis work?</summary>
              <div className="ans">You film a few shots on your phone and upload the clip. It grades your mechanics across ten categories with notes on what it actually saw, and every score carries a confidence level. Being straight with you about the limits: it reads still frames from your video, the same way a coach does stepping through film — it is not a biomechanics lab, and anything your footage does not clearly show comes back marked &quot;insufficient footage&quot; instead of guessed at.</div>
            </details>
            <details>
              <summary>What makes Mindset Hockey different?</summary>
              <div className="ans">One of two named coaches works with your player directly — never an anonymous reviewer. Both are current Jr hockey players. The program combines shot mechanics, a structured weekly plan and mindset coaching in one system, instead of leaving the 167 hours between lessons unplanned. <Link href="/coaches">Meet the coaches here</Link>.</div>
            </details>
            <details>
              <summary>How do I get started?</summary>
              <div className="ans">Book a free assessment and tell us your player&apos;s age and level. We respond to every inquiry within 24 hours with an honest read on what to work on first.</div>
            </details>
          </div>
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
