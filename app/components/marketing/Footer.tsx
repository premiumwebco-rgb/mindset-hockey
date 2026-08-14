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
            {/* Social icons removed until the accounts actually exist. Three
                dead links read as an abandoned business to a visitor — and to a
                payment processor reviewing the site. Add them back here when the
                handles are live. */}
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
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refunds">Cancellation &amp; Refunds</Link>
          </div>
          <div className="f-col">
            <h4>Get started</h4>
            <Link href="/pricing">See Pricing</Link>
            <Link href="/signup?plan=standard">Create Account</Link>
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
