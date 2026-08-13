import Link from 'next/link';

export default function StickyCta() {
  return (
    <div className="stickycta" id="stickyCta">
      <a className="call" href="tel:+12404356511" aria-label="Call Mindset Hockey">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
        </svg>
      </a>
      <Link className="btn btn-primary btn-block" href="/contact" data-cta="sticky_mobile" data-cta-location="sticky">
        Book Free Assessment
      </Link>
    </div>
  );
}
