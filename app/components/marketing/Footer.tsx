import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="f-grid">
          <div className="f-col">
            <Link className="logo" href="/"><b>MINDSET</b><span>HOCKEY</span></Link>
            <p className="muted small mt1" style={{ maxWidth: '34ch' }}>
              Hockey training in Waldorf, Maryland for players 10–18. Skill development, strength,
              nutrition, video analysis and mindset coaching — built by a player who made the jump, for
              the ones trying to.
            </p>
            <p className="small mt1 muted">
              The Capital Clubhouse<br />3033 Waldorf Market Place<br />Waldorf, MD 20603
            </p>
            <p className="small mt1">
              <a href="tel:+12404356511">(240) 435-6511</a><br />
              <a href="mailto:braydencastiglia@gmail.com">braydencastiglia@gmail.com</a>
            </p>
            <div className="socials">
              <a href="https://instagram.com/mindsethockey" aria-label="Mindset Hockey on Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://youtube.com/@mindsethockey" aria-label="Mindset Hockey on YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://tiktok.com/@mindsethockey" aria-label="Mindset Hockey on TikTok">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 6.5A4.5 4.5 0 0 0 18.5 11" /></svg>
              </a>
            </div>
          </div>
          <div className="f-col">
            <h4>Programs</h4>
            <Link href="/programs">All Programs</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/programs#shot-analysis">Shot Analysis</Link>
            <Link href="/programs#mindset">Mindset Development</Link>
            <Link href="/pricing#premium">Premium Program</Link>
            <Link href="/contact?plan=custom">Custom Quote</Link>
          </div>
          <div className="f-col">
            <h4>Company</h4>
            <Link href="/about">About &amp; Story</Link>
            <Link href="/coaches">Coaching Staff</Link>
            <Link href="/locations">Waldorf, MD Location</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
          <div className="f-col">
            <h4>Get started</h4>
            <Link href="/contact">Free Assessment</Link>
            <a href="tel:+12404356511">Call Us</a>
            <a href="mailto:braydencastiglia@gmail.com">Email Us</a>
            <Link href="/login">Member Login</Link>
          </div>
        </div>
        <div className="f-bot">
          <span>© 2026 Mindset Hockey. All rights reserved.</span>
          <span>Individual results vary. No program can guarantee placement at any level of hockey.</span>
        </div>
      </div>
    </footer>
  );
}
