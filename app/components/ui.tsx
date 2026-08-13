import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Pillar, Tier } from '@/lib/types';

/* ---------------------------------------------------------------- Button */
export function Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  block,
  type = 'button',
  disabled,
}: {
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-bold tracking-wide transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none';
  const sizes = {
    sm: 'px-4 py-2 text-[13px]',
    md: 'px-6 py-3 text-[14px]',
    lg: 'px-8 py-4 text-[15px]',
  };
  const variants = {
    primary:
      'bg-electric text-white shadow-[0_8px_30px_rgba(10,132,255,.32)] hover:bg-electric-glow hover:-translate-y-0.5',
    ghost:
      'border border-white/[.14] text-white hover:border-electric hover:bg-electric/10 hover:-translate-y-0.5',
    quiet: 'text-silver-dim hover:text-white',
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${block ? 'w-full' : ''}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Card */
export function Card({
  children,
  className = '',
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
  );
}

/* --------------------------------------------------------------- Eyebrow */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow mb-4 flex items-center gap-3">
      <span className="h-px w-7 bg-electric" />
      {children}
    </p>
  );
}

/* ----------------------------------------------------------- PageHeading */
export function PageHeading({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="display text-[clamp(28px,4vw,44px)]">{title}</h1>
        {sub && <p className="mt-3 max-w-[62ch] text-[15.5px] text-silver-dim">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- StatBlock */
export function Stat({
  label,
  value,
  delta,
  suffix,
  sub,
}: {
  label: string;
  value: string | number;
  delta?: number;
  suffix?: string;
  /** Caption rendered under the number. */
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="display text-[38px] leading-none">{value}</span>
        {suffix && <span className="text-[13px] text-silver-dim">{suffix}</span>}
        {delta !== undefined && delta !== 0 && (
          <span
            className={`text-[13px] font-semibold ${
              delta > 0 ? 'text-electric-glow' : 'text-silver-dim'
            }`}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-[12.5px] text-silver-dim">{sub}</p>}
    </Card>
  );
}

/* -------------------------------------------------------------- LockBadge */
/**
 * Locked content stays VISIBLE with a lock badge rather than being hidden.
 * Hiding upgrade-tier content destroys the upgrade path; showing it creates
 * the desire. This is the highest-leverage revenue decision in the app.
 */
export function LockBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-electric-glow">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      {tier}
    </span>
  );
}

export function TierPill({ tier }: { tier: Tier }) {
  const map: Record<Tier, string> = {
    none: 'border-white/15 text-silver-dim',
    basic: 'border-white/25 text-silver',
    premium: 'border-electric/50 text-electric-glow bg-electric/10',
  };
  const label: Record<Tier, string> = {
    none: 'no plan',
    basic: 'standard',
    premium: 'premium',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${map[tier]}`}
    >
      {label[tier]}
    </span>
  );
}

/* ------------------------------------------------------------ PillarChip */
const PILLAR_LABEL: Record<Pillar, string> = {
  mindset: 'Mindset',
  mechanics: 'Mechanics',
  skill: 'Skill',
  systems: 'Systems',
  habits: 'Habits',
  leadership: 'Leadership',
};

export function PillarChip({ pillar }: { pillar: Pillar }) {
  return (
    <span className="inline-block rounded-md border border-white/10 bg-navy-700/60 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[.12em] text-silver-dim">
      {PILLAR_LABEL[pillar]}
    </span>
  );
}

/* ------------------------------------------------------------- ProgressBar */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between text-[12.5px]">
          <span className="text-silver">{label}</span>
          <span className="text-silver-dim tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700">
        <div
          className="h-full rounded-full bg-electric transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- EmptyState */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <h3 className="display text-[22px]">{title}</h3>
      <p className="mx-auto mt-3 max-w-[46ch] text-[15px] text-silver-dim">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Card>
  );
}

/* -------------------------------------------------------- VideoPlaceholder */
export function VideoPlaceholder({
  label,
  aspect = 'aspect-video',
}: {
  label: string;
  aspect?: string;
}) {
  return (
    <div
      className={`relative ${aspect} w-full overflow-hidden rounded-xl border border-white/[.08] bg-navy-900`}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-electric shadow-[0_10px_36px_rgba(10,132,255,.5)]">
            <svg width="16" height="19" viewBox="0 0 22 26" fill="#fff" className="ml-1">
              <path d="M22 13 0 26V0z" />
            </svg>
          </div>
          <p className="mt-3 text-[12px] uppercase tracking-[.16em] text-silver-dim">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
