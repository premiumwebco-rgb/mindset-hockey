import { requireSession, DEMO_MODE } from '@/lib/session';
import { PILLARS } from '@/lib/types';
import { planFromParam } from '@/lib/plans';
import { Button, Card, PageHeading } from '@/components/ui';
import CheckoutSuccessBanner, { type CheckoutState } from '@/components/CheckoutSuccessBanner';

export const metadata = { title: 'Set up your player' };

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  /* ---- Returning from Stripe Checkout ------------------------------------
     The query string is treated as a hint, never as proof. When it claims
     success we ask Stripe directly and confirm the session belongs to this
     member before showing anything. Entitlement itself still comes from
     profiles.subscription_active, written only by the webhook. */
  let checkoutState: CheckoutState | null = null;
  let checkoutPlan: string | null = null;

  if (sp.checkout === 'success' && !DEMO_MODE) {
    if (!sp.session_id) {
      checkoutState = 'unverified';
    } else {
      const { verifyCheckoutSession } = await import('@/lib/stripe');
      const result = await verifyCheckoutSession(sp.session_id, session.userId);
      checkoutPlan = planFromParam(
        'planName' in result ? result.planName : null
      )?.name ?? null;

      if (result.state === 'paid') {
        // Paid is settled. Whether the member can USE it depends on the
        // webhook having landed — that is the lag window the banner polls.
        checkoutState = session.subscriptionActive ? 'active' : 'pending';
      } else if (result.state === 'processing') {
        checkoutState = 'pending';
      } else if (result.state === 'unpaid') {
        checkoutState = 'unpaid';
      } else {
        checkoutState = 'unverified';
      }
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      {checkoutState && (
        <CheckoutSuccessBanner state={checkoutState} planName={checkoutPlan} />
      )}

      <PageHeading
        eyebrow="Three steps · about 60 seconds"
        title="Set up your player"
        sub="This is what the weekly plan is built from. Be honest about the level — an over-stated level produces a plan that's too hard, and a plan that's too hard gets abandoned."
      />

      <form action="/dashboard" className="grid gap-4">
        <Card className="p-6">
          <p className="eyebrow mb-4">Step 1 — the basics</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                First name
              </label>
              <input id="first" name="first" placeholder="Tyler" required />
            </div>
            <div>
              <label htmlFor="birth" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Birth year
              </label>
              <input id="birth" name="birth" type="number" placeholder="2011" required />
            </div>
            <div>
              <label htmlFor="level" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Current level
              </label>
              <select id="level" name="level" defaultValue="a">
                <option value="house">House / Rec</option>
                <option value="a">A</option>
                <option value="aa">AA</option>
                <option value="aaa">AAA</option>
                <option value="prep">Prep</option>
                <option value="junior">Junior</option>
              </select>
            </div>
            <div>
              <label htmlFor="position" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Position
              </label>
              <select id="position" name="position" defaultValue="forward">
                <option value="forward">Forward</option>
                <option value="defense">Defence</option>
                <option value="goalie">Goalie</option>
              </select>
            </div>
            <div>
              <label htmlFor="shoots" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Shoots
              </label>
              <select id="shoots" name="shoots" defaultValue="right">
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label htmlFor="flex" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Stick flex
              </label>
              <input id="flex" name="flex" type="number" placeholder="65" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-2">Step 2 — pick two pillars to start with</p>
          <p className="mb-4 text-[14px] text-silver-dim">
            Two. Not six. A plan that attacks everything at once changes nothing.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <label
                key={p.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.1] bg-ink px-4 py-3.5 transition-colors hover:border-white/25"
              >
                <input
                  type="checkbox"
                  name="pillars"
                  value={p.key}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0A84FF]"
                  defaultChecked={p.key === 'mechanics' || p.key === 'mindset'}
                />
                <span>
                  <span className="block text-[14.5px] font-semibold text-white">{p.label}</span>
                  <span className="block text-[12.5px] text-silver-dim">{p.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-2">Step 3 — how many days a week</p>
          <p className="mb-4 text-[14px] text-silver-dim">
            Pick a number you&apos;ll actually hit. Four honest days beats seven imaginary ones.
          </p>
          <select name="days" defaultValue="4" aria-label="Training days per week">
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} days per week
              </option>
            ))}
          </select>
        </Card>

        <Button type="submit" size="lg" block>
          Build my first week
        </Button>
      </form>
    </div>
  );
}
