import { requireSession } from '@/lib/session';
import { PLANS } from '@/lib/plans';
import { Card, Eyebrow } from '@/components/ui';
import CheckoutButton from '@/components/CheckoutButton';

export const metadata = { title: 'Plans — Mindset Hockey' };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string; f?: string; checkout?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  return (
    <div>
      <Eyebrow>Membership</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Choose your program</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        A one-time setup fee covers the intake assessment, your baseline breakdown and your first
        custom plan. The monthly fee keeps the coaching, tracking and check-ins running.
      </p>

      {sp.checkout === 'cancelled' && (
        <Card className="mt-6 border-amber/40 bg-amber/[.06] p-4 text-[14.5px] text-silver">
          Checkout was cancelled — nothing has been charged.
        </Card>
      )}
      {sp.need === 'premium' && (
        <Card className="mt-6 border-electric/40 bg-electric/[.06] p-4 text-[14.5px] text-silver">
          That area is part of the Premium program.
        </Card>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {PLANS.map((plan) => {
          const current = session.tier === plan.tier && session.subscriptionActive;
          return (
            <Card
              key={plan.slug}
              className={`flex flex-col p-7 ${
                plan.featured ? 'border-electric bg-gradient-to-b from-[#0E1E3C] to-[#0A1428]' : ''
              }`}
            >
              {plan.featured && (
                <span className="mb-3 self-start rounded-full bg-rink-red px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-white">
                  Most chosen
                </span>
              )}
              <h2 className="display text-[24px]">{plan.name}</h2>
              <p className="mt-1.5 min-h-[44px] text-[14px] text-silver-dim">{plan.who}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <b className="display text-[46px] leading-none text-white">${plan.setupFee}</b>
                <span className="text-[13px] font-semibold text-silver-dim">one-time setup</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2 border-t border-white/[.08] pt-3">
                <b className="display text-[30px] leading-none text-electric-glow">
                  ${plan.monthly}
                </b>
                <span className="text-[13px] font-semibold text-silver-dim">/ month</span>
              </div>
              <p className="mt-3 text-[12.5px] text-silver-dim">
                No contract. Cancel the monthly any time.
              </p>

              <ul className="mt-6 grid gap-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={`flex gap-2.5 text-[14.5px] ${
                      f.included ? 'text-silver' : 'text-silver-dim/50 line-through'
                    }`}
                  >
                    <span className={f.included ? 'text-electric-glow' : 'text-silver-dim/40'}>
                      {f.included ? '✓' : '—'}
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {current ? (
                  <p className="rounded-[10px] border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-6 py-3 text-center text-[14px] font-bold text-[#3ddc84]">
                    Your current plan
                  </p>
                ) : (
                  <CheckoutButton plan={plan.slug} featured={plan.featured}>
                    {plan.cta}
                  </CheckoutButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 p-7">
        <h2 className="display text-[22px]">Custom</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] text-silver-dim">
          Need something tailored specifically to your goals? Build a custom package by selecting
          the services you want from our Premium offerings and more. Contact us for a personalized
          quote.
        </p>
        <a
          href="/contact?plan=custom"
          className="mt-5 inline-flex rounded-[10px] bg-rink-red px-6 py-3 text-[14px] font-bold text-white"
        >
          Request Custom Quote
        </a>
      </Card>
    </div>
  );
}
