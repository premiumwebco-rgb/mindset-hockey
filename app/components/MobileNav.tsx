'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ==========================================================================
   COMPACT MOBILE BOTTOM NAV

   Five most-used destinations, fixed to the bottom of the viewport on phones
   only (hidden at lg: and up, where the full Sidebar takes over). This is
   deliberately additive: Sidebar's hamburger drawer is untouched and still
   carries the full nav (including Coaching/Admin sections), so nothing a
   coach or admin could reach before is now unreachable — this bar is just a
   faster path to the five things a player opens most.
   ========================================================================== */

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function iconProps(active: boolean) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: active ? '#4d8dff' : 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

const ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <rect x="3" y="5" width="14" height="11" rx="2" />
        <path d="m17 9 4-2.5v9L17 13" />
      </svg>
    ),
  },
  {
    href: '/library',
    label: 'Training',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
      </svg>
    ),
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 19v-6M12.5 19V9M17 19v-3" />
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[.08] bg-navy-900/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-semibold"
          >
            <span className={active ? 'text-electric-glow' : 'text-silver-dim'}>
              {item.icon(active)}
            </span>
            <span className={active ? 'text-white' : 'text-silver-dim'}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
