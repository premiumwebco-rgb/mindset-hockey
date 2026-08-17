import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'About Mindset Hockey | Founder-Led Hockey Training in Waldorf, MD',
  description:
    "The story behind Mindset Hockey: a 16U A player who broke his rib twice, rebuilt his shot and mindset, reached AAA, signed to play Jr hockey — and founded a hockey development program in Waldorf, Maryland.",
  alternates: { canonical: 'https://mindsethockey.com/about' },
  openGraph: {
    title: 'About Mindset Hockey | Founder-Led Hockey Training in Waldorf, MD',
    description:
      "The story behind Mindset Hockey: a 16U A player who broke his rib twice, rebuilt his shot and mindset, reached AAA, signed to play Jr hockey — and founded a hockey development program in Waldorf, Maryland.",
    url: 'https://mindsethockey.com/about',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'About' },
  ],
};

const TIMELINE = [
  { when: 'The starting point', title: '16U A — overlooked', body: "Not the fastest. Not the most skilled. Not on anyone's list. Working hard and going nowhere, because working hard without a system is just being tired.", key: false },
  { when: 'The setback', title: 'Broken rib — the first time', body: "Months out. Sitting in the stands watching the game move on without me. This is where most players quietly disappear — not because they can't play, but because the time away breaks how they see themselves.", key: true },
  { when: 'The decision', title: 'Rebuilding the shot from zero', body: 'If I couldn\'t skate, I could learn. I studied shot mechanics frame by frame and built a training system I could run in a garage. That framework is now the 7-point rubric.', key: false },
  { when: 'The second setback', title: 'Broken rib — again', body: "The second one is harder, because the first already cost you a year. That's when I stopped training only my body and started training how I thought.", key: true },
  { when: 'The turn', title: 'Alternate captain', body: 'I came back more reliable, not more talented. Coaches started using me in the moments that mattered. Then they gave me a letter.', key: false },
  { when: 'The jump', title: 'AAA', body: "The level I was told I'd never reach. Same body. Different mechanics, different habits, different head.", key: false },
  { when: 'Then', title: 'Signed — Jr Hockey', body: 'Talent helps. Mindset, discipline and consistent work change careers. Everything I did is written down, filmed, and now coached.', key: true },
  { when: 'Today', title: 'Founded Mindset Hockey', body: "I turned the system into a business, based at The Capital Clubhouse in Waldorf, Maryland. As owner I set the program's direction and standards — and I brought on a development coach who's a current Jr hockey player, a former captain, and chasing NCAA opportunities, because your player should learn from people still living it.", key: true },
];

export default function About() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="About" />

      <section style={{ paddingBottom: '30px' }}>
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">The story behind the program</p>
            <h1>It wasn&apos;t a<br />straight line</h1>
            <p className="lede mt2">I&apos;m Coach Brayden Castiglia — founder and owner of Mindset Hockey. I&apos;m not telling you what worked twenty years ago — I&apos;m telling you what worked recently, at the level your player is trying to reach.</p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="teamgrid rv">
            <figure className="teamphoto">
              <img src="/media/photo-faceoff.jpg" alt="Coach Brayden Castiglia, owner of Mindset Hockey, in a Team Maryland number 17 jersey lined up for a faceoff" width={1250} height={830} />
              <figcaption>Team Maryland · #17</figcaption>
            </figure>
            <div className="teamside">
              <div className="card">
                <h3>Coach Brayden Castiglia</h3>
                <p className="mt1">16U A player. Two broken ribs. Alternate captain. AAA. Signed to play Jr hockey. Every drill and rubric point on this site came out of that climb.</p>
                <p className="mt1">I own and run Mindset Hockey — the vision, the training systems, the coaching standard and the day-to-day operation. I&apos;m also still on the ice with players, and I&apos;m the person who answers your first message.</p>
                <p className="mt1"><Link className="btn btn-ghost btn-sm" href="/coaches" data-cta="about_to_coaches" data-cta-location="about">Meet the coaching staff</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv"><p className="eyebrow center">The journey</p><h2>How it actually went</h2></div>
          <div className="tl">
            {TIMELINE.map((t) => (
              <div key={t.title} className={`tl-item rv${t.key ? ' key' : ''}`}>
                <p className="tl-when">{t.when}</p>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
          <p className="center mt3"><Link className="btn btn-ghost" href="/coaches" data-cta="timeline_coaches" data-cta-location="about">Meet the Coaching Staff</Link></p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <div className="head center rv"><p className="eyebrow center">How we work</p><h2>What you can expect</h2></div>
          <div className="cards c2 rv">
            <article className="card"><h3>Honest assessments</h3><p>If your player doesn&apos;t need us yet, we&apos;ll tell you. If the footage isn&apos;t usable, we&apos;ll tell you that too — at no charge.</p></article>
            <article className="card"><h3>Named coaching</h3><p>Every video review is done by a named coach who recently played the level your player is chasing. Nothing is outsourced to a queue.</p></article>
            <article className="card"><h3>No outcome promises</h3><p>We never promise placement at any level. We promise better mechanics, a real plan, and a player who handles a bad game better.</p></article>
            <article className="card"><h3>24-hour responses</h3><p>Every inquiry gets a reply within 24 hours. Premium members get breakdowns back inside 72 — usually under 48.</p></article>
          </div>
          <div className="contactstrip mt3 rv">
            <div><h3>Want to talk it through?</h3><p>No pitch. Tell us where your player is and we&apos;ll give you a straight answer.</p></div>
            <div className="acts"><Link className="btn btn-primary" href="/contact" data-cta="about_contact" data-cta-location="about">Book a Free Assessment</Link><a className="btn btn-ghost" href="tel:+12404356511">Call Now</a></div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">The staff</p>
            <h2>I don&apos;t coach<br />this alone</h2>
            <p className="lede mt2">I built the program and I run it — but your player also works with Coach Jack Magill, a development coach who is a current Jr hockey player, a former captain, and pursuing NCAA opportunities. Two coaches, one system, both still living the game.</p>
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
                <p>Coach Brayden owns the business and set every development system here — the 7-point rubric, the six pillars and the standard the whole staff coaches to. Still on the ice and in the film room every week, and the person who answers your first message.</p>
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
                <p>Broke his collarbone and wrist at 16 playing Single-A, rebuilt his shot from the ground up, and reached the Jr hockey level by 20. He&apos;s currently exploring NCAA opportunities — and he coaches the climb he&apos;s still on.</p>
              </div>
            </article>
          </div>
          <p className="center mt3"><Link className="btn btn-ghost" href="/coaches" data-cta="staffstrip_coaches" data-cta-location="staffstrip">Meet the Coaching Staff</Link></p>
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
