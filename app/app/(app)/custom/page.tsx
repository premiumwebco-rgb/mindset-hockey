import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { CUSTOM_COACHING_SERVICES } from '@/lib/permissions';
import { centsToDisplay, CUSTOM_PLAN_BASE_CENTS } from '@/lib/customPlan';
import { Card, Eyebrow } from '@/components/ui';
import RequestPlanForm from '../coaching/request/RequestPlanForm';

export const metadata = { title: 'Build Your Plan — Mindset Hockey' };

/* ============================================================================
   "BUILD YOUR PLAN" — under the "Create a Custom Plan" nav section, alongside
   the premium "1-on-1 Online Coaching" page (app/(app)/coaching/one-on-one).

   Central, always-visible location for every authenticated member — including
   a brand-new member who has purchased nothing — to see the 4 Custom Plan
   options and build one. Two independent things happen on this page, and
   they must never be confused with each other:

     1. OPTION OVERVIEW (below) — read-only. It renders each of the 4
        CUSTOM_COACHING_SERVICES options and whether THIS member already has
        it, straight from `session.permissions` (the same permission columns
        every other gated page in the app reads — see lib/session.ts /
        lib/permissions.ts). Rendering this page, or rendering an option as
        "locked", NEVER writes anything and never grants anything — it is a
        plain read of existing entitlement state.

     2. THE BUILDER (<RequestPlanForm />) — the exact existing Custom Plan
        builder/checkout component (unchanged) that already talks to
        /api/stripe/custom-plan/checkout, which independently recomputes the
        price server-side and is the only thing that can actually grant a
        permission (via the Stripe webhook's grantCustomPlan(), see
        app/api/stripe/webhook/route.ts). This page adds no new grant path.
   ============================================================================ */

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function OptionCard({
  label,
  description,
  unlocked,
}: {
  label: string;
  description?: string;
  unlocked: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        unlocked ? 'border-[#3ddc84]/40 bg-[#3ddc84]/[.06]' : 'border-white/[.1] bg-white/[.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-white">{label}</p>
          {description && <p className="mt-1 text-[12.5px] text-silver-dim">{description}</p>}
        </div>
        {unlocked ? (
          <span className="shrink-0 rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3ddc84]">
            Included
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-semibold text-silver-dim">
            <LockIcon />
            Locked
          </span>
        )}
      </div>
      {!unlocked && (
        <Link
          href="#build"
          className="mt-3 inline-flex text-[12.5px] font-semibold text-electric-glow hover:text-electric"
        >
          Unlock with Custom Plan →
        </Link>
      )}
    </div>
  );
}

export default async function CustomPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  // Same server-side pricing constant the checkout route and the live
  // preview both use — see lib/customPlan.ts. Never hardcode this number
  // anywhere else; it is read here purely for display.
  const startingPriceDisplay = centsToDisplay(CUSTOM_PLAN_BASE_CENTS);

  return (
    <div>
      <Eyebrow>Create a Custom Plan</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Build Your Plan</h1>
      <p className="mt-3 max-w-[68ch] text-[16px] text-silver">
        Build your plan. Start at {startingPriceDisplay}/month for one option — add more any time
        and your price updates automatically. Every member can build a Custom Plan, whether or not
        you have a Membership.
      </p>
      <p className="mt-2 max-w-[68ch] text-[13px] text-silver-dim">
        {startingPriceDisplay}/month is the entry price for a single option, not full access to
        everything below. Seeing an option here does not mean you have access to it — each one
        unlocks only once you&apos;ve purchased it (or it&apos;s been granted by a coach).
      </p>

      {sp.checkout === 'success' && (
        <Card className="mt-6 border-[#3ddc84]/40 bg-[#3ddc84]/[.08] p-4 text-[14.5px] text-silver">
          Payment received — your Custom Plan is being set up now. It can take a moment for your
          access to update.
        </Card>
      )}
      {sp.checkout === 'cancelled' && (
        <Card className="mt-6 border-amber/40 bg-amber/[.06] p-4 text-[14.5px] text-silver">
          Checkout was cancelled — nothing has been charged.
        </Card>
      )}

      <section className="mt-8">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-silver-dim">
          Custom Plan Options
        </p>
        <p className="mb-3 text-[12.5px] text-silver-dim">
          Coaching-driven options — never included automatically with Membership. A coach reviews
          and enables exactly what you&apos;ve purchased.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CUSTOM_COACHING_SERVICES.map((s) => (
            <OptionCard
              key={s.key}
              label={s.label}
              description={s.description}
              unlocked={session.role === 'admin' || Boolean(session.permissions[s.relatedPermission])}
            />
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-silver-dim">
          Athletes enrolled in a Custom Plan can reach out to their coach whenever they need
          additional guidance or support — that access is always included.
        </p>
      </section>

      <div id="build" className="mt-10 scroll-mt-6">
        <Card className="p-6 sm:p-8">
          <h2 className="display text-[22px]">Build your Custom Plan</h2>
          <p className="mt-2 max-w-[62ch] text-[14.5px] text-silver-dim">
            Select whatever you&apos;re interested in — see the price update as you go, then check
            out right away. Not ready to commit? You can submit it as a request instead and a
            coach will follow up.
          </p>
          <div className="mt-6">
            <RequestPlanForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
