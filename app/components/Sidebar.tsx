'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Tier, Role } from '@/lib/types';
import { TIER_LABEL } from '@/lib/types';
import { FEATURE_MIN_TIER, type Feature } from '@/lib/plans';
import SignOutButton from '@/components/auth/SignOutButton';

interface NavItem {
  href: string;
  label: string;
  feature?: Feature;
  badge?: string;
}

const MEMBER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', feature: 'dashboard' },
  // Included with Standard AND Premium — feature gate is 'basic'.
  { href: '/analysis', label: 'AI Shot Analysis', feature: 'ai_shot_analysis', badge: 'AI' },
  { href: '/reviews', label: 'Video Review', feature: 'video_review' },
  { href: '/workouts', label: 'Workout Plans', feature: 'workout_plans' },
  { href: '/nutrition', label: 'Nutrition', feature: 'nutrition_plans' },
  { href: '/mindset', label: 'Mindset Training', feature: 'mindset_training' },
  { href: '/progress', label: 'Progress', feature: 'basic_tracking' },
  { href: '/library', label: 'Training Resources', feature: 'basic_resources' },
];

const STAFF_NAV: NavItem[] = [
  { href: '/coach/queue', label: 'Review Queue' },
  { href: '/coach/ai-queue', label: 'AI Review Queue' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/subscriptions', label: 'Subscriptions' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/nutrition', label: 'Nutrition CMS' },
  { href: '/admin/leads', label: 'Leads' },
];

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function Sidebar({
  tier,
  role,
  demo,
  subscriptionActive,
  playerName,
}: {
  tier: Tier;
  role: Role;
  demo: boolean;
  subscriptionActive: boolean;
  playerName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'coach';

  function locked(item: NavItem): boolean {
    if (isAdmin) return false;
    if (!item.feature) return false;
    const need = FEATURE_MIN_TIER[item.feature];
    if (need === 'none') return false;
    if (!subscriptionActive) return true;
    if (need === 'premium') return tier !== 'premium';
    return tier === 'none';
  }

  function section(title: string, items: NavItem[]) {
    if (!items.length) return null;
    return (
      <div className="mb-6">
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-silver-dim">
          {title}
        </p>
        <nav className="grid gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const isLocked = locked(item);
            return (
              <Link
                key={item.href}
                href={
                  isLocked
                    ? `/upgrade?need=${item.feature ? FEATURE_MIN_TIER[item.feature] : 'premium'}&f=${item.feature}`
                    : item.href
                }
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                  active
                    ? 'bg-electric/12 font-semibold text-white'
                    : isLocked
                      ? 'text-silver-dim/70 hover:text-silver-dim'
                      : 'text-silver hover:bg-white/[.04] hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && !isLocked && (
                    <span className="rounded bg-electric/20 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-electric-glow">
                      {item.badge}
                    </span>
                  )}
                </span>
                {isLocked && <LockIcon />}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  const body = (
    <>
      {section('Training', MEMBER_NAV)}
      {isStaff && section('Coaching', STAFF_NAV)}
      {isAdmin && section('Admin', ADMIN_NAV)}
      {section('Account', [{ href: '/account', label: 'Account & Billing' }])}
    </>
  );

  return (
    <>
      {/* mobile bar */}
      <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4 lg:hidden">
        <Link href="/dashboard" className="flex flex-col leading-[.85]">
          <b className="display text-[18px]">MINDSET</b>
          <span className="pl-px text-[8px] font-bold tracking-[.42em] text-silver-dim">
            HOCKEY
          </span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="grid gap-[5px] p-2"
        >
          <i className="block h-0.5 w-5 rounded bg-silver" />
          <i className="block h-0.5 w-5 rounded bg-silver" />
          <i className="block h-0.5 w-5 rounded bg-silver" />
        </button>
      </div>

      <aside
        className={[
          'shrink-0 border-white/[.08] bg-navy-900/40 px-4 py-6 lg:block lg:w-[248px] lg:border-r',
          open ? 'block border-b' : 'hidden',
        ].join(' ')}
      >
        <Link href="/dashboard" className="mb-7 hidden flex-col px-3 leading-[.85] lg:flex">
          <b className="display text-[20px]">MINDSET</b>
          <span className="pl-px text-[9px] font-bold tracking-[.42em] text-silver-dim">
            HOCKEY
          </span>
        </Link>

        <div className="mb-6 rounded-xl border border-white/[.08] bg-ink px-3.5 py-3">
          <p className="truncate text-[13px] font-semibold text-white">{playerName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-silver-dim">
            <span
              className={[
                'inline-block h-1.5 w-1.5 rounded-full',
                subscriptionActive || isAdmin ? 'bg-[#3ddc84]' : 'bg-amber',
              ].join(' ')}
            />
            {isAdmin ? 'Admin' : TIER_LABEL[tier]}
            {!subscriptionActive && !isAdmin && tier !== 'none' && ' · inactive'}
          </p>
        </div>

        {body}

        <div className="mt-6 border-t border-white/[.08] px-3 pt-4">
          <SignOutButton />
        </div>

        {demo && (
          <p className="mt-4 rounded-lg border border-dashed border-amber/40 bg-amber/[.06] px-3 py-2 text-[11px] text-amber">
            Demo mode — no backend connected.
          </p>
        )}
      </aside>
    </>
  );
}
