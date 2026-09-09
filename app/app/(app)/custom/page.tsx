import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { CUSTOM_COACHING_SERVICES } from '@/lib/permissions';
import { centsToDisplay, CUSTOM_PLAN_BASE_CENTS } from '@/lib/customPlan';
import RequestPlanForm from '../coaching/request/RequestPlanForm';

export const metadata = { title: 'Build Your Plan — Mindset Hockey' };

/* ============================================================================
   "BUILD YOUR PLAN" — under the "Create a Custom Plan" nav section, alongside
   the premium "Live Virtual Coaching" page (app/(app)/coaching/one-on-one).

   Restyled to reuse that page's gold/dark premium visual system exactly —
   same radial-gradient page background, same gold (#f0c674) accent instead
   of the site's usual electric blue, same card borders/shadows/typography
   hierarchy — so the two "Create a Custom Plan" destinations read as one
   consistent product family instead of two different visual styles. See
   app/(app)/coaching/one-on-one/page.tsx's header comment for the shared
   color system this reuses.

   Two independent things happen on this page, and they must never be
   confused with each other:

     1. OPTION OVERVIEW (below) — read-only. It renders each of the 4
        CUSTOM_COACHING_SERVICES options and whether THIS member already has
        it, straight from `session.permissions` (the same permission columns
        every other gated page in the app reads — see lib/session.ts /
        lib/permissions.ts). Rendering this page, or rendering an option as
        "locked", NEVER writes anything and never grants anything — it is a
        plain read of existing entitlement state.

     2. THE BUILDER (<RequestPlanForm />) — the exact existing Custom Plan
        builder/checkout component, now restoring the original Standard +
        Personalized two-column layout (see RequestPlanForm.tsx's header
        comment) so the two can be combined into a single plan. It already
        talks to /api/stripe/custom-plan/checkout, which independently
        recomputes the price server-side and is the only thing that can
        actually grant a permission (via the Stripe webhook's
        grantCustomPlan(), see app/api/stripe/webhook/route.ts). This page
        adds no new grant path.
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
          {description && <p className="mt-1 text-[12.5px] text-white/50">{description}</p>}
        </div>
        {unlocked ? (
          <span className="shrink-0 rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3ddc84]">
            Included
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-semibold text-white/50">
            <LockIcon />
            Locked
          </span>
        )}
      </div>
      {!unlocked && (
        <Link
          href="#build"
          className="mt-3 inline-flex text-[12.5px] font-semibold text-[#f0c674] hover:text-[#f6d896]"
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
    <div className="-mx-5 -my-8 rounded-[24px] bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(240,198,116,0.10),transparent),linear-gradient(180deg,#05070d_0%,#0a0e1a_55%,#05070d_100%)] px-5 py-12 sm:-mx-10 sm:px-10 lg:-my-10">
      <div className="mx-auto max-w-[720px] text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f0c674]/30 bg-[#f0c674]/[.06] px-4 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.24em] text-[#f0c674]">
          Create a Custom Plan
        </span>
        <h1 className="display mt-5 text-[clamp(30px,5.5vw,48px)] text-white">Build Your Plan</h1>
        <p className="mx-auto mt-4 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
          Start at {startingPriceDisplay}/month for one option — add more any time and your price
          updates automatically. Every member can build a Custom Plan, whether or not you have a
          Membership.
        </p>
        <p className="mx-auto mt-2 max-w-[62ch] text-[13px] leading-relaxed text-white/40">
          {startingPriceDisplay}/month is the entry price for a single option, not full access to
          everything below. Seeing an option here does not mean you have access to it — each one
          unlocks only once you&apos;ve purchased it (or it&apos;s been granted by a coach).
        </p>
      </div>

      {sp.checkout === 'success' && (
        <div className="mx-auto mt-6 max-w-[720px] rounded-xl border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] p-4 text-center text-[14.5px] text-white/80">
          Payment received — your Custom Plan is being set up now. It can take a moment for your
          access to update.
        </div>
      )}
      {sp.checkout === 'cancelled' && (
        <div className="mx-auto mt-6 max-w-[720px] rounded-xl border border-amber/40 bg-amber/[.06] p-4 text-center text-[14.5px] text-white/80">
          Checkout was cancelled — nothing has been charged.
        </div>
      )}

      <section className="mx-auto mt-12 max-w-[960px]">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#f0c674]">
          Custom Plan Options
        </p>
        <p className="mb-3 text-[12.5px] text-white/50">
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
        <p className="mt-3 text-[12.5px] text-white/50">
          Athletes enrolled in a Custom Plan can reach out to their coach whenever they need
          additional guidance or support — that access is always included.
        </p>
      </section>

      <div id="build" className="mx-auto mt-10 max-w-[960px] scroll-mt-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-6 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)] sm:p-8">
          <h2 className="display text-[22px] text-white">Build your Custom Plan</h2>
          <p className="mt-2 max-w-[62ch] text-[14.5px] text-white/60">
            Select whatever you&apos;re interested in — Standard Options (already part of
            Membership) and Personalized Options combine into one plan with one price. See it
            update as you go, then check out right away. Not ready to commit? You can submit it
            as a request instead and a coach will follow up.
          </p>
          <div className="mt-6">
            <RequestPlanForm />
          </div>
        </div>
      </div>
    </div>
  );
}
