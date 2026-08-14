'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/programs', label: 'Programs' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/locations', label: 'Location' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Shared marketing-site nav. Reads the current route to decide which link
 * gets aria-current, so site.css can draw the underline — mirrors the static
 * site's per-page markup. Burger/scroll behavior is handled by the vanilla
 * site.js loaded in the (marketing) layout; this component just renders the
 * DOM it expects.
 */
export default function Nav() {
  const pathname = usePathname();
  const active = pathname === '/' ? '/' : LINKS.find((l) => l.href !== '/' && pathname.startsWith(l.href))?.href;

  return (
    <header className="nav" id="nav">
      <div className="wrap nav-in">
        <Link className="logo" href="/" aria-label="Mindset Hockey home">
          <b>MINDSET</b>
          <span>HOCKEY</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-cta">
          <a className="nav-phone" href="tel:+12404356511">(240) 435-6511</a>
          <Link className="nav-phone" href="/login" data-cta="member_login" data-cta-location="nav">
            Member Login
          </Link>
          <Link
            className="btn btn-primary btn-sm"
            href="/contact"
            data-cta="book_assessment"
            data-cta-location="nav"
          >
            Free Assessment
          </Link>
          <button className="burger" id="burger" aria-label="Open menu" aria-expanded="false">
            <i></i><i></i><i></i>
          </button>
        </div>
      </div>
      <div id="mobileMenu">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
        <Link href="/login">Member Login</Link>
        <a href="tel:+12404356511">Call (240) 435-6511</a>
      </div>
    </header>
  );
}
