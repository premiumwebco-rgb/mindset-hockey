import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumbs from '@/components/marketing/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Contact | Book a Free Hockey Assessment in Waldorf, MD | Mindset Hockey',
  description:
    "Book a free hockey assessment at The Capital Clubhouse in Waldorf, Maryland, or request a custom quote. Tell us your player's age, level and goals — we reply within 24 hours.",
  alternates: { canonical: 'https://mindsethockey.com/contact' },
  openGraph: {
    title: 'Contact | Book a Free Hockey Assessment in Waldorf, MD | Mindset Hockey',
    description:
      "Book a free hockey assessment at The Capital Clubhouse in Waldorf, Maryland, or request a custom quote. Tell us your player's age, level and goals — we reply within 24 hours.",
    url: 'https://mindsethockey.com/contact',
    images: ['https://mindsethockey.com/assets/og-image.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['https://mindsethockey.com/assets/og-image.jpg'] },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mindsethockey.com/' },
    { '@type': 'ListItem', position: 2, name: 'Contact' },
  ],
};

export default function Contact() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }} />

      <Breadcrumbs current="Contact" />

      <section style={{ paddingBottom: '20px' }}>
        <div className="faceoff" style={{ width: '430px', height: '430px', top: '-80px', left: '-150px' }} aria-hidden="true" />
        <div className="wrap">
          <div className="head center">
            <p className="eyebrow center">Get started</p>
            <h1>Book a free<br />assessment</h1>
            <p className="lede mt2">Tell us where your player is and what&apos;s frustrating you. You&apos;ll get an honest read on what to work on first — including if the answer is &quot;not yet.&quot;</p>
            <p className="mt2"><span className="respond">⏱ We respond to all inquiries within 24 hours</span></p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="split">
            <div className="rv">
              {/* Same form contract site.js already handles: data-track-form
                  drives GA4 event tracking + client-side validation, and
                  data-fallback-email opens a pre-filled mailto since no
                  action/data-netlify is set (matches the original static
                  site's behavior — never wired to a backend endpoint). */}
              <form className="form" data-track-form="assessment_request" data-fallback-email="braydencastiglia@gmail.com" noValidate>
                <div className="form-row">
                  <div className="field"><label htmlFor="parentName">Your name</label><input id="parentName" name="name" required autoComplete="name" /><span className="err">Please enter your name.</span></div>
                  <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /><span className="err">Please enter a valid email.</span></div>
                </div>
                <div className="form-row">
                  <div className="field"><label htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
                  <div className="field"><label htmlFor="playerAge">Player&apos;s age</label>
                    <select id="playerAge" name="age" defaultValue="14">
                      <option>10</option><option>11</option><option>12</option><option>13</option><option>14</option><option>15</option><option>16</option><option>17</option><option>18</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="field"><label htmlFor="level">Current level</label>
                    <select id="level" name="level" defaultValue="A">
                      <option>House / Rec</option><option>A</option><option>AA</option><option>AAA</option><option>Prep</option><option>Junior</option>
                    </select>
                  </div>
                  <div className="field"><label htmlFor="plan">Program of interest</label>
                    <select id="plan" name="plan" defaultValue="not_sure">
                      <option value="not_sure">Not sure yet</option>
                      <option value="on_ice">Private on-ice session — $149</option>
                      <option value="standard">Standard — $249 setup + $100/mo</option>
                      <option value="premium">Premium — $389 setup + $149/mo</option>
                      <option value="custom">Custom quote</option>
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field"><label htmlFor="training">Training preference</label>
                    <select id="training" name="training" defaultValue="waldorf">
                      <option value="waldorf">In person — The Capital Clubhouse, Waldorf MD</option>
                      <option value="remote">Remote / video coaching</option>
                      <option value="both">A mix of both</option>
                    </select>
                  </div>
                </div>
                <div className="field"><label htmlFor="goals">What&apos;s frustrating you right now?</label>
                  <textarea id="goals" name="goals" required placeholder="e.g. He works hard but his shot hasn't improved, and he got cut at tryouts in the spring." />
                  <span className="err">Tell us a little about your player so we can give a useful answer.</span>
                </div>
                <button className="btn btn-primary btn-lg btn-block" type="submit" data-cta="submit_assessment" data-cta-location="contact_form">Send — Get a Reply Within 24 Hours</button>
                <p className="fineprint">No spam, no sales calls. We read every message ourselves.</p>
              </form>
            </div>

            <div className="rv">
              <div className="card"><h3>Prefer to talk?</h3>
                <p className="mt1 muted">Most families would rather have a five-minute conversation than fill in a form. That&apos;s fine — call or text.</p>
                <p className="mt2"><a className="btn btn-primary btn-block" href="tel:+12404356511" data-cta="call_from_contact" data-cta-location="contact_page">Call (240) 435-6511</a></p>
                <p className="mt1"><a className="btn btn-ghost btn-block" href="mailto:braydencastiglia@gmail.com">Email braydencastiglia@gmail.com</a></p>
              </div>
              <div className="card mt2"><h3>What happens next</h3>
                <ol className="mt1" style={{ paddingLeft: '18px', color: 'var(--silver-dim)', fontSize: '14.5px' }}>
                  <li className="mt1">We reply within 24 hours with a few questions.</li>
                  <li className="mt1">Short call to understand the player and the season.</li>
                  <li className="mt1">Honest recommendation — including &quot;not yet&quot; if that&apos;s the truth.</li>
                  <li className="mt1">If it&apos;s a fit, we start with the baseline video breakdown.</li>
                </ol>
              </div>
              <div className="card mt2"><h3>Where we train</h3>
                <p className="mt1 muted small"><b style={{ color: 'var(--white)' }}>The Capital Clubhouse</b><br />3033 Waldorf Market Place<br />Waldorf, MD 20603</p>
                <p className="mt1 muted small">Monday–Sunday, 6:00am–9:00pm ET, by appointment.<br />Serving Waldorf, Charles County and Southern Maryland — plus remote coaching nationwide.</p>
                <p className="mt1 small"><Link href="/locations">Location &amp; directions →</Link></p>
              </div>
              <div className="card mt2"><h3>Who you&apos;ll hear from</h3>
                <p className="mt1 muted small">Every inquiry goes straight to Coach Brayden Castiglia, the owner of the program — not an assistant or an inbox. He answers it himself within 24 hours.</p>
                <div className="ministaff mt2">
                  <figure><img src="/media/coach-brayden-headshot.jpg" alt="Coach Brayden Castiglia, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width={560} height={560} loading="lazy" /><figcaption>Coach Brayden Castiglia<em>Owner · Jr hockey player</em></figcaption></figure>
                  <figure><img src="/media/coach-jack-headshot.jpg" alt="Coach Jack Magill, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width={620} height={619} loading="lazy" /><figcaption>Coach Jack Magill<em>Jr hockey player · Development Coach</em></figcaption></figure>
                </div>
                <p className="mt2 small muted">Two coaches, both current Jr hockey players. One of us owns the program; both of us coach it.</p>
                <p className="mt1 small"><Link href="/coaches">Meet the coaching staff →</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
