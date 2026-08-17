import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Hockey Training in Waldorf, Maryland | The Capital Clubhouse | Mindset Hockey',
  description:
    'Hockey training and player development at The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD. Serving Charles County and Southern Maryland, plus remote video coaching.',
  alternates: { canonical: 'https://mindsethockey.com/locations' },
  openGraph: {
    title: 'Hockey Training in Waldorf, Maryland | The Capital Clubhouse | Mindset Hockey',
    description:
      'Hockey training and player development at The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD. Serving Charles County and Southern Maryland, plus remote video coaching.',
    url: 'https://mindsethockey.com/locations',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const LOCATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  '@id': 'https://mindsethockey.com/#business',
  name: 'Mindset Hockey',
  description:
    'Hockey training and player development in Waldorf, Maryland. Skill development, strength and conditioning, nutrition, video analysis and mindset coaching for players 10-18 at The Capital Clubhouse.',
  url: 'https://mindsethockey.com/locations',
  telephone: '+1-240-435-6511',
  address: { '@type': 'PostalAddress', streetAddress: '3033 Waldorf Market Place', addressLocality: 'Waldorf', addressRegion: 'MD', postalCode: '20603', addressCountry: 'US' },
  geo: { '@type': 'GeoCoordinates', latitude: 38.6284, longitude: -76.931 },
  containedInPlace: { '@type': 'SportsActivityLocation', name: 'The Capital Clubhouse' },
  areaServed: [
    { '@type': 'City', name: 'Waldorf' },
    { '@type': 'City', name: 'White Plains' },
    { '@type': 'City', name: 'La Plata' },
    { '@type': 'City', name: 'Brandywine' },
    { '@type': 'AdministrativeArea', name: 'Charles County' },
    { '@type': 'AdministrativeArea', name: 'Southern Maryland' },
  ],
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '06:00', closes: '21:00' }],
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Waldorf, MD Location' },
  ],
};

export default function Locations() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCATION_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Waldorf, MD Location" />

      <section style={{ paddingBottom: '30px' }}>
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">Where we train</p>
            <h1>Hockey training in<br />Waldorf, Maryland</h1>
            <p className="lede mt2">All in-person ice and off-ice sessions run out of one home rink — The Capital Clubhouse in Waldorf. One location means a consistent schedule, familiar ice and no chasing coaches across the state.</p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <div className="venue">
                <p className="eyebrow">Our home rink</p>
                <p className="vname">The Capital Clubhouse</p>
                <address>3033 Waldorf Market Place<br />Waldorf, MD 20603</address>
                <div className="vmeta">
                  <div><b>Training</b><span>On-ice skill sessions, off-ice shooting and strength work, and video capture for analysis.</span></div>
                  <div><b>Hours</b><span>Monday–Sunday, 6:00am–9:00pm ET (by appointment)</span></div>
                  <div><b>Serving</b><span>Waldorf, White Plains, La Plata, Brandywine, Charles County and Southern Maryland</span></div>
                  <div><b>Contact</b><span><a href="tel:+12404356511">(240) 435-6511</a> · <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a></span></div>
                </div>
                <p className="mt2">
                  <a className="btn btn-primary" href="https://www.google.com/maps/dir/?api=1&destination=The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603" target="_blank" rel="noopener" data-cta="get_directions" data-cta-location="locations">Get Directions</a>{' '}
                  <Link className="btn btn-ghost" href="/contact?location=waldorf" data-cta="book_waldorf" data-cta-location="locations">Book a Session Here</Link>
                </p>
              </div>
            </div>
            <div className="rv">
              <div className="card">
                <h3>Private on-ice sessions — $149</h3>
                <p className="mt1 muted">Shooting development, stickhandling, skating work, hockey IQ and position-specific coaching, with immediate feedback on the ice. Both coaches are on when we&apos;re both available, and session sizes stay small so every player gets real reps.</p>
                <p className="mt1 muted">Filmed on two angles, so the same session becomes your next video breakdown. You&apos;ll get ice times, entrance and locker room notes by email once you&apos;re booked.</p>
                <p className="mt2"><Link className="btn btn-primary btn-sm" href="/contact?plan=on-ice" data-plan="on_ice" data-cta="book_on_ice" data-cta-location="locations">Book a Private Session</Link></p>
              </div>
              <div className="card mt2">
                <h3>Both coaches are on site</h3>
                <p className="mt1 muted">Sessions at The Capital Clubhouse are run by Coach Brayden Castiglia, the owner of the program, or by Coach Jack Magill, our development coach — a current Jr hockey player and NCAA prospect. Never an assistant you&apos;ve never heard of.</p>
                <p className="mt1 small"><Link href="/coaches">Meet the coaching staff →</Link></p>
              </div>
              <div className="card mt2">
                <h3>Free parking, easy access</h3>
                <p className="mt1 muted">Just off Route 301 in the Waldorf Market Place area, with free on-site parking. Most families in Charles County are here in under 25 minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rinkline" aria-hidden="true" />

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Who we serve</p>
            <h2>Southern Maryland families</h2>
            <p className="lede mt2">The Capital Clubhouse sits just off Route 301 in Waldorf, which makes it a straightforward drive for most of Charles County and the surrounding area.</p>
          </div>
          <div className="cards c3">
            <article className="card rv"><h3>Waldorf &amp; White Plains</h3><p className="mt1">Our home base. Weeknight and weekend sessions, with the shortest drive for families in Waldorf, White Plains and St. Charles.</p><p className="mt1 small"><Link href="/contact?location=waldorf" data-cta="area_waldorf" data-cta-location="locations">Book in Waldorf →</Link></p></article>
            <article className="card rv"><h3>Charles County</h3><p className="mt1">La Plata, Bryans Road, Indian Head and Hughesville are all a short drive up 301 or 225. Most local families get here in under 25 minutes.</p><p className="mt1 small"><Link href="/contact?location=charles-county" data-cta="area_charles" data-cta-location="locations">Book from Charles County →</Link></p></article>
            <article className="card rv"><h3>Southern Maryland</h3><p className="mt1">Brandywine, Clinton, Accokeek and the wider Southern Maryland area, including families crossing from Prince George&apos;s County and Calvert County.</p><p className="mt1 small"><Link href="/contact?location=southern-maryland" data-cta="area_somd" data-cta-location="locations">Book from Southern MD →</Link></p></article>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <p className="eyebrow">Not local?</p>
              <h2 style={{ fontSize: 'clamp(24px,4vw,38px)' }}>Remote coaching<br />works the same</h2>
              <p className="lede mt2">The core of the program is video analysis and a written weekly plan — neither needs you in the room. Most of what makes a player better happens between sessions anyway.</p>
              <ul className="ticks">
                <li>Film two phone angles at your home rink or driveway</li>
                <li>Breakdown returned inside 72 hours</li>
                <li>Weekly plan updated from the scores</li>
                <li>Monthly check-in call</li>
              </ul>
              <p className="mt2"><Link className="btn btn-primary" href="/contact?location=remote" data-cta="location_remote" data-cta-location="locations">Start Remote Coaching</Link></p>
            </div>
            <div className="rv">
              <div className="card">
                <h3>Getting here</h3>
                <p className="mt1 muted">The Capital Clubhouse is at 3033 Waldorf Market Place, Waldorf, MD 20603, just off Route 301 in the Waldorf Market Place area. Parking is free and on-site. Once your sessions are booked you&apos;ll get ice times, entrance and locker room notes by email.</p>
                <p className="mt2"><a className="btn btn-ghost btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603" target="_blank" rel="noopener" data-cta="get_directions_secondary" data-cta-location="locations">Open in Google Maps</a></p>
              </div>
              <div className="card mt2">
                <h3>Contact</h3>
                <p className="mt1 small"><a href="tel:+12404356511">(240) 435-6511</a><br /><a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a></p>
                <p className="mt1 small muted">Monday–Sunday, 6am–9pm ET</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="head center rv">
            <p className="eyebrow center">Who you&apos;ll train with</p>
            <h2>Two coaches at<br />the Waldorf rink</h2>
            <p className="lede mt2">Every session at The Capital Clubhouse is run by one of these two — both current Jr hockey players. One of us owns the program; both of us coach it.</p>
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
