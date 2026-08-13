import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Hockey Training Programs in Waldorf, MD | Shot Analysis & Mindset Development',
  description:
    'Hockey development programs for players 10–18 in Waldorf, Maryland: 7-point shot mechanics analysis, mindset development training, hockey workout and nutrition plans, and video breakdowns.',
  alternates: { canonical: 'https://mindsethockey.com/programs' },
  openGraph: {
    title: 'Hockey Training Programs in Waldorf, MD | Shot Analysis & Mindset Development',
    description:
      'Hockey development programs for players 10–18 in Waldorf, Maryland: 7-point shot mechanics analysis, mindset development training, hockey workout and nutrition plans, and video breakdowns.',
    url: 'https://mindsethockey.com/programs',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Programs' },
  ],
};

export default function Programs() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Programs" />

      <section style={{ paddingBottom: '34px' }}>
        <div className="faceoff" style={{ width: '460px', height: '460px', top: '-90px', right: '-150px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">What we coach</p>
            <h1>Programs built<br />around the player</h1>
            <p className="lede mt2">Six pillars, one system, coached at The Capital Clubhouse in Waldorf, Maryland — and remotely. Every program below maps to the same framework, so nothing your player learns is disconnected from anything else.</p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }} id="shot-analysis">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <p className="eyebrow">Program 01</p>
              <h2 style={{ fontSize: 'clamp(24px,4vw,38px)' }}>Shot mechanics analysis</h2>
              <p className="lede mt2">Film two phone angles. Every submission comes back scored 1–10 on all seven mechanics points, with timestamped notes on the exact frame each one breaks.</p>
              <ul className="ticks">
                <li>Weight transfer, stick flex, release timing, hand position</li>
                <li>Follow through, balance and shooting posture</li>
                <li>Coach voiceover walking through every fix</li>
                <li>Three prescribed drills added to the weekly plan</li>
                <li>Re-film at 30 days for a side-by-side comparison</li>
              </ul>
              <p className="mt2"><Link className="btn btn-primary" href="/contact?plan=premium" data-plan="premium" data-cta="program_shot" data-cta-location="programs">Get Your Shot Analyzed</Link></p>
              <p className="mt2 small muted"><b className="hl">AI Shot Analysis is included with both the Standard and Premium programs.</b> Upload a clip from your phone and it grades ten mechanics categories, telling you what it could see and how confident it is. It reads video frames — it is not a biomechanics lab, and anything the footage does not show clearly comes back marked rather than guessed at.</p>
            </div>
            <figure className="sample rv">
              <img src="/media/release-annotated.jpg" alt="Annotated hockey shot release frame showing loaded stick flex, puck leaving the toe of the blade, planted front foot and airborne back leg" width={1280} height={720} loading="lazy" />
              <figcaption>A real scored release frame</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band" id="mindset">
        <div className="wrap">
          <div className="split rev">
            <figure className="hero-shot rv" style={{ margin: 0 }}>
              <img src="/media/photo-battle-square.jpg" alt="Coach Brayden, number 17, battling for a loose puck in front of the net during a game" width={800} height={800} loading="lazy" />
              <figcaption>Coach Brayden — the season everything changed</figcaption>
            </figure>
            <div className="rv">
              <p className="eyebrow">Program 02 · Included with Premium</p>
              <h2 style={{ fontSize: 'clamp(24px,4vw,38px)' }}>Mindset development<br />training</h2>
              <p className="lede mt2">Physical skills are only part of the equation. Our Premium athletes receive guidance on confidence, discipline, accountability and mental performance so they can perform at their best both on and off the ice.</p>
              <ul className="ticks">
                <li>The 20-second reset for the shift after a mistake</li>
                <li>Building a repeatable pre-game routine</li>
                <li>Confidence follows evidence — how to manufacture it</li>
                <li>Coming back from injury without losing yourself</li>
                <li>What to do when the coach stops playing you</li>
              </ul>
              <p className="mt2"><Link className="btn btn-primary" href="/pricing#premium" data-plan="premium" data-cta="program_mindset" data-cta-location="programs">See the Premium Program</Link></p>
            </div>
          </div>
        </div>
      </section>

      <section id="mindset-topics">
        <div className="crease" style={{ width: '340px', height: '170px', right: '-90px', top: '60px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">What we actually coach</p>
            <h2>Ten things nobody<br />teaches at practice</h2>
            <p className="lede mt2">Hockey success comes from developing the athlete and the person. Each of these is coached deliberately, with a drill or routine attached — not as a pep talk.</p>
          </div>
          <div className="mindgrid rv">
            <div className="mind"><b>01</b><h3>Confidence building</h3><p>Confidence follows evidence. We build the evidence on purpose — tracked reps, visible progress, scores that move.</p></div>
            <div className="mind"><b>02</b><h3>Mental toughness</h3><p>Finishing the session, the shift and the season when it stops being fun. Trained through standards, not slogans.</p></div>
            <div className="mind"><b>03</b><h3>Handling mistakes</h3><p>The 20-second reset. What to do between the turnover and the next puck drop so one error doesn&apos;t become four.</p></div>
            <div className="mind"><b>04</b><h3>Performing under pressure</h3><p>Tryouts, showcases, playoff overtime. Breathing, focus cues and narrowing attention to the next play only.</p></div>
            <div className="mind"><b>05</b><h3>Goal setting</h3><p>Process goals he controls instead of outcome goals he doesn&apos;t. Reviewed monthly against real tracking data.</p></div>
            <div className="mind"><b>06</b><h3>Accountability</h3><p>Owning the tape, the missed session and the bad shift — without spiraling. The single biggest separator we see.</p></div>
            <div className="mind"><b>07</b><h3>Winning habits</h3><p>The daily standard: sleep, fuel, stick work, film. What he does on the days nobody is watching.</p></div>
            <div className="mind"><b>08</b><h3>Discipline &amp; consistency</h3><p>Showing up at the same level on low-motivation days. Systems and streaks that make the choice smaller.</p></div>
            <div className="mind"><b>09</b><h3>Game preparation</h3><p>A repeatable pre-game routine — timing, warm-up, music, visualization — so he arrives ready instead of hoping.</p></div>
            <div className="mind"><b>10</b><h3>Leadership</h3><p>Communicating with coaches, holding teammates to a standard and becoming the player used in the moments that matter.</p></div>
          </div>
          <div className="honestnote rv">
            <p><span className="hl">Why this is in the program at all:</span> Coach Brayden lost most of two seasons to broken ribs and our development coach broke his collarbone and wrist at 16. Both came back further along than they left. Neither of those comebacks was a physical story — and that&apos;s exactly why the mental side is coached here instead of assumed.</p>
          </div>
          <p className="center mt3"><Link className="btn btn-primary btn-lg" href="/pricing#premium" data-plan="premium" data-cta="mindset_premium" data-cta-location="programs_mindset">Mindset Training Is Included With Premium</Link></p>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv"><p className="eyebrow center">Program 03–06</p><h2>The rest of the system</h2></div>
          <div className="cards c2">
            <article className="card rv"><span className="num">03</span><h3>Skill development</h3><p>Hands, edges, puck protection, deception and winning 1-on-1s. On-ice and off-ice progressions your player can actually run at home between sessions.</p></article>
            <article className="card rv"><span className="num">04</span><h3>Training systems</h3><p>Weekly plans built from age, level and position. In-season versus off-season periodization, load management and recovery — so he peaks for tryouts, not in October.</p></article>
            <article className="card rv"><span className="num">05</span><h3>Habits &amp; nutrition</h3><p>The daily standard, practice structure and game habits — plus a specialized hockey nutrition and meal plan on Premium. The unglamorous part that decides everything.</p></article>
            <article className="card rv"><span className="num">06</span><h3>Leadership &amp; recruiting</h3><p>Coachability, communicating with coaches, and how Junior recruiting actually works — what scouts look at, when they look, and what parents get wrong.</p></article>
          </div>
          <div className="contactstrip mt3 rv">
            <div><h3>Which program does your player need?</h3><p>Tell us the age, level and the thing that&apos;s frustrating you. We&apos;ll give you an honest recommendation.</p></div>
            <div className="acts"><Link className="btn btn-primary" href="/contact" data-cta="programs_help" data-cta-location="programs">Talk to a Coach</Link><Link className="btn btn-ghost" href="/pricing">See Pricing</Link></div>
          </div>
        </div>
      </section>

      <section id="complete-system">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">The Premium Program</p>
            <h2>A complete development<br />system, not just training</h2>
            <p className="lede mt2">Most players get skills coaching and nothing else — no strength plan, no nutrition, no film, no mental side. Premium puts all five together so they reinforce each other instead of competing for his time.</p>
          </div>
          <div className="cards c5 rv">
            <article className="card"><span className="num">01</span><h3>Skill development</h3><p>Shot mechanics, hands, edges and 1-on-1 play, coached against the 7-point rubric.</p></article>
            <article className="card"><span className="num">02</span><h3>Strength &amp; conditioning</h3><p>A specialized hockey workout plan built for his age, level and season phase.</p></article>
            <article className="card"><span className="num">03</span><h3>Nutrition</h3><p>A specialized hockey nutrition and meal plan — fueling for practice, games and growth.</p></article>
            <article className="card"><span className="num">04</span><h3>Video analysis</h3><p>Scored breakdowns with timestamped notes, coach voiceover and prescribed drills.</p></article>
            <article className="card"><span className="num">05</span><h3>Mindset coaching</h3><p>Confidence, discipline, accountability and performing under pressure — coached on purpose.</p></article>
          </div>
          <p className="center mt3"><Link className="btn btn-primary btn-lg" href="/pricing#premium" data-plan="premium" data-cta="premium_complete" data-cta-location="programs">See Premium — $389 setup + $149/mo</Link></p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Who coaches it</p>
            <h2>Every program above is<br />coached by these two</h2>
            <p className="lede mt2">No queue, no anonymous reviewer, no rotating cast of part-timers. Your player works with Coach Brayden, who built this system, or with Coach Jack, a current Junior A player and NCAA prospect.</p>
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
                <p>Coach Brayden owns the business and set every development system here — the 7-point rubric, the six pillars and the standard the whole staff coaches to. Still on the ice and in the film room every week, and the person who answers your first message.</p>
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
                <p>Broke his collarbone and wrist at 16 playing Single-A, rebuilt his shot from the ground up, and reached Junior A by 20. He&apos;s currently exploring NCAA opportunities — and he coaches the climb he&apos;s still on.</p>
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
