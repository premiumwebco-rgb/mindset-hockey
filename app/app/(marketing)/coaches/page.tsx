import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Coaching Staff | Hockey Coaches in Waldorf, Maryland | Mindset Hockey',
  description:
    'Meet the Mindset Hockey coaching staff: Coach Brayden, owner and lead coach, and Coach Jack, a Junior A development coach and NCAA prospect, training players in Waldorf, MD.',
  alternates: { canonical: 'https://mindsethockey.com/coaches' },
  openGraph: {
    title: 'Coaching Staff | Hockey Coaches in Waldorf, Maryland | Mindset Hockey',
    description:
      'Meet the Mindset Hockey coaching staff: Coach Brayden, owner and lead coach, and Coach Jack, a Junior A development coach and NCAA prospect, training players in Waldorf, MD.',
    url: 'https://mindsethockey.com/coaches',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const STAFF_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  '@id': 'https://mindsethockey.com/#business',
  name: 'Mindset Hockey',
  url: 'https://mindsethockey.com/coaches',
  employee: [
    {
      '@type': 'Person',
      jobTitle: 'Coach, Founder & Owner',
      name: 'Coach Brayden',
      description:
        'Coach, founder and owner of Mindset Hockey. Junior A player who progressed from 16U A to AAA to Junior A. Owns the business and oversees all player development systems, program direction and coaching standards.',
    },
    {
      '@type': 'Person',
      jobTitle: 'Development Coach',
      name: 'Coach Jack',
      description: 'Junior A player and NCAA prospect. Skill development specialist and player mentor at Mindset Hockey.',
    },
  ],
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Coaching Staff' },
  ],
};

export default function Coaches() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STAFF_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Coaching Staff" />

      <section style={{ paddingBottom: '30px' }}>
        <div className="faceoff" style={{ width: '470px', height: '470px', top: '-100px', right: '-160px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">The coaching staff</p>
            <h1>Learn from coaches<br />still living the game</h1>
            <p className="lede mt2">Two coaches, both currently playing Junior A. Our staff combines leadership, experience and a passion for player development — helping athletes improve their skills, confidence and understanding of the game, on and off the ice. One of us owns the program; both of us coach it.</p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="staff">
            <article className="coach lead rv">
              <div className="coach-photo">
                <span className="coach-badge">Coach &amp; Owner</span>
                <img src="/media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width={560} height={560} loading="lazy" />
              </div>
              <div className="coach-body">
                <h3>Coach Brayden</h3>
                <p className="coach-role">Owner &amp; Lead Coach · Junior A Player</p>
                <ul className="chips">
                  <li>Junior A Player</li><li>Program Founder</li><li>Business Owner</li>
                  <li>Lead Coach</li><li>Former Alternate Captain</li>
                </ul>
                <p>I started Mindset Hockey because nobody coached me on the two things that actually changed my career — my shot mechanics and how I thought. I was a 16U A player who broke his rib twice, lost most of two seasons, rebuilt from zero, earned a letter, moved up to AAA and signed with a Junior A organization.</p>
                <p>As owner I set the direction of the program: the seven-point shot rubric, the six-pillar framework, the weekly plan structure and the standard every coach on this staff is held to. I oversee all operations and player development systems — and I&apos;m still on the ice and in the film room with players every week.</p>
                <p>I&apos;m also the person you talk to first. Every inquiry comes to me, and I answer it myself within 24 hours.</p>
                <div className="foot">
                  <Link className="btn btn-red btn-block" href="/contact" data-cta="contact_founder" data-cta-location="coaches">Talk to Coach Brayden</Link>
                  <p className="mt1 small center"><Link href="/about">Read the full story →</Link></p>
                </div>
              </div>
            </article>

            <article className="coach rv">
              <div className="coach-photo">
                <span className="coach-badge blue">Development Coach</span>
                <img src="/media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width={620} height={619} />
              </div>
              <div className="coach-body">
                <h3>Coach Jack</h3>
                <p className="coach-role">Development Coach · Junior A Player</p>
                <ul className="chips">
                  <li>Junior A Player</li><li>NCAA Prospect</li>
                  <li>Skill Development Specialist</li><li>Player Mentor</li>
                </ul>
                <p>Hockey stopped being just a sport for Jack early on — it became the thing he built his life around. At 16, playing Single-A, he broke his collarbone and his wrist. Those injuries became the turning point of his career.</p>
                <p>He refused to let the setbacks define him and used them as fuel. Rebuilding his shot after the wrist injury took months of deliberate, unglamorous work, and it taught him how to break a skill down to its parts and put it back together properly.</p>
                <p>That work took him from Single-A at 16 to competing at the Junior A level by 20. He&apos;s currently exploring opportunities with NCAA programs as he continues chasing the next level.</p>
                <p>Because he&apos;s lived both the setbacks and the success, Jack knows exactly what the climb demands. As a coach his focus is developing the whole player — the skills on the ice, and the confidence, discipline, work ethic and mindset that decide how far those skills go.</p>
                <div className="foot">
                  <Link className="btn btn-primary btn-block" href="/contact" data-cta="contact_coach_jack" data-cta-location="coaches">Book a Free Assessment</Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Coach Jack · game film</p>
            <h2>He&apos;s still playing<br />at the level you&apos;re chasing</h2>
            <p className="lede mt2">Real Junior A game film. The point isn&apos;t highlights — it&apos;s that the person coaching your player is competing at the level right now, not describing it from memory.</p>
          </div>
          <div className="compare rv">
            <div className="facade" data-lf-video="" data-video-src="/media/coach-jack-clip-1.mp4" data-video-title="Coach Jack game film 1" role="button" tabIndex={0} aria-label="Play Coach Jack game film, clip one">
              <span className="tag">Junior A · game film</span>
              <img src="/media/poster-coach-clip-1.jpg" alt="Junior A game film still showing Coach Jack circled as the play develops in the offensive zone" width={1172} height={540} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Reading the play and attacking the middle</div>
            </div>
            <div className="facade" data-lf-video="" data-video-src="/media/coach-jack-clip-2.mp4" data-video-title="Coach Jack game film 2" role="button" tabIndex={0} aria-label="Play Coach Jack game film, clip two">
              <span className="tag">Junior A · game film</span>
              <img src="/media/poster-coach-clip-2.jpg" alt="Junior A game film still showing a rush entering the offensive zone" width={1172} height={540} loading="lazy" />
              <span className="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z" /></svg></span></span>
              <div className="cap">Zone entry into a net-front finish</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="head center rv"><p className="eyebrow center">How the staff works</p><h2>One system, two coaches</h2></div>
          <div className="cards c3">
            <article className="card rv"><span className="num">01</span><h3>Coach Brayden sets the system</h3><p>The framework, the rubric and the coaching standard are Coach Brayden&apos;s. Every plan that goes out is built on the same system, so nothing a player learns from one coach contradicts the other.</p></article>
            <article className="card rv"><span className="num">02</span><h3>Coach Jack develops the skills</h3><p>Skill sessions, shot rebuilds and mentoring from someone currently competing at Junior A and pursuing NCAA opportunities — recent enough to remember every step of the climb.</p></article>
            <article className="card rv"><span className="num">03</span><h3>Nothing gets outsourced</h3><p>Every breakdown is done by a named coach on this page. There&apos;s no queue, no anonymous reviewer, and no template responses.</p></article>
          </div>
          <div className="contactstrip mt3 rv">
            <div><h3>Want to meet the staff?</h3><p>Book a free assessment at The Capital Clubhouse in Waldorf and meet Coach Brayden and Coach Jack before you commit to anything.</p></div>
            <div className="acts"><Link className="btn btn-primary" href="/contact" data-cta="coaches_contact" data-cta-location="coaches">Book a Free Assessment</Link><Link className="btn btn-ghost" href="/pricing">See Programs</Link></div>
          </div>
        </div>
      </section>

      <section className="finale">
        <div className="wrap">
          <h2 className="rv">Talent helps. Mindset changes careers.</h2>
          <p className="lede rv" style={{ maxWidth: '58ch' }}>Tell us your player&apos;s age, level and what&apos;s frustrating you. We&apos;ll come back within 24 hours with an honest read on what to work on first.</p>
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
