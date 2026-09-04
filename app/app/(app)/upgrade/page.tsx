import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { PLAN_BY_SLUG } from '@/lib/plans';
import { PERMISSION_LABEL, isPermissionKey } from '@/lib/permissions';
import { Card, Eyebrow } from '@/components/ui';
import CheckoutButton from '@/components/CheckoutButton';

export const metadata = { title: 'Plans — Mindset Hockey' };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; p?: string; checkout?: string; plan?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const plan = PLAN_BY_SLUG.membership;

  const neededPermission = isPermissionKey(sp.p) ? sp.p : null;

  return (
    <div>
      <Eyebrow>Membership</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">One plan, full access</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Mindset Hockey Membership is $49/month with no setup fee and includes every non-coaching
        area of the platform. Want 1-on-1 coaching, check-ins or a custom program? Request a
        Custom Coaching plan below.
      </p>

      {sp.checkout === 'cancelled' && (
        <Card className="mt-6 border-amber/40 bg-amber/[.06] p-4 text-[14.5px] text-silver">
          Checkout was cancelled — nothing has been charged.
        </Card>
      )}
      {(neededPermission || sp.f) && !session.subscriptionActive && (
        <Card className="mt-6 border-electric/40 bg-electric/[.06] p-4 text-[14.5px] text-silver">
          {neededPermission
            ? `${PERMISSION_LABEL[neededPermission]} is part of the Mindset Hockey Membership.`
            : 'That area is part of the Mindset Hockey Membership.'}{' '}
          Join below to unlock it.
        </Card>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col border-electric bg-gradient-to-b from-[#0E1E3C] to-[#0A1428] p-7">
          <span className="mb-3 self-start rounded-full bg-rink-red px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-white">
            Full platform access
          </span>
          <h2 className="display text-[24px]">{plan.name}</h2>
          <p className="mt-1.5 min-h-[44px] text-[14px] text-silver-dim">{plan.who}</p>

          <div className="mt-5 flex items-baseline gap-2">
            <b className="display text-[46px] leading-none text-white">${plan.monthly}</b>
            <span className="text-[13px] font-semibold text-silver-dim">/ month</span>
          </div>
          <p className="mt-3 text-[12.5px] text-silver-dim">
            No setup fee. No contract. Cancel any time.
          </p>

          <ul className="mt-6 grid gap-2.5">
            {plan.features.map((f) => (
              <li key={f.label} className="flex gap-2.5 text-[14.5px] text-silver">
                <span className="text-electric-glow">✓</span>
                {f.label}
              </li>
            ))}
          </ul>

          <div className="mt-7">
            {session.subscriptionActive ? (
              <p className="rounded-[10px] border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-6 py-3 text-center text-[14px] font-bold text-[#3ddc84]">
                Your current plan
              </p>
            ) : (
              <CheckoutButton plan={plan.slug} featured>
                {plan.cta}
              </CheckoutButton>
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-7">
          <h2 className="display text-[24px]">Custom Coaching</h2>
          <p className="mt-1.5 min-h-[44px] text-[14px] text-silver-dim">
            Build a coaching package around exactly what this athlete needs.
          </p>

          <ul className="mt-5 grid gap-2.5">
            {[
              'Personalized coaching',
              'Custom development plans',
              '1-on-1 coaching options',
              'Flexible pricing',
            ].map((label) => (
              <li key={label} className="flex gap-2.5 text-[14.5px] text-silver">
                <span className="text-electric-glow">✓</span>
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[12.5px] text-silver-dim">
            No self-serve checkout — an admin sets this up with you after reviewing your request.
          </p>

          <div className="mt-7">
            <Link
              href="/coaching/request"
              className="inline-flex w-full items-center justify-center rounded-[10px] bg-rink-red px-6 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5"
            >
              Request Custom Plan
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
