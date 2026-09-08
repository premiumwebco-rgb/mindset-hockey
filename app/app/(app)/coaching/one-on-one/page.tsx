import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { CUSTOM_COACHING_SERVICES } from '@/lib/permissions';
import { centsToDisplay, CUSTOM_PLAN_BASE_CENTS } from '@/lib/customPlan';
import PremiumIntro from './PremiumIntro';

export const metadata = { title: '1-on-1 Online Coaching — Mindset Hockey' };

/* ==========================================================================
   1-ON-1 ONLINE COACHING — premium experience page

   Sits under "Create a Custom Plan" alongside "Build Your Plan" (/custom).
   Deliberately visually distinct from the rest of the app — a gold/premium
   accent instead of the site's usual electric blue, a darker gradient
   background, and elevated cards with heavier shadows — so this reads as an
   exclusive, elite-athlete coaching program rather than another settings
   page. Like /custom, this is a read-only view: it shows lock/unlock state
   straight from session.permissions and never grants anything itself — the
   only thing that ever grants a permission is the Stripe webhook's
   grantCustomPlan(), after a real purchase on the Build Your Plan page.

   Feature set here is intentionally narrow (Weekly Check-Ins, Video
   Reviews) — Direct Messaging Support, Personalized Development Plan and
   Future In-Person Sessions are retired as separate sell points (see
   lib/permissions.ts's CUSTOM_COACHING_SERVICES doc comment); direct
   messaging is instead folded into the "reach out any time" note below,
   and every Custom Plan already includes a personalized plan by default.
   ========================================================================== */

const FEATURED_KEYS = ['weekly_checkins', 'video_reviews'] as const;

export default async function OneOnOneCoachingPage() {
  const session = await requireSession();
  const featured = CUSTOM_COACHING_SERVICES.filter((s) =>
    (FEATURED_KEYS as readonly string[]).includes(s.key)
  );
  const startingPriceDisplay = centsToDisplay(CUSTOM_PLAN_BASE_CENTS);

  return (
    <div className="-mx-5 -my-8 rounded-[24px] bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(240,198,116,0.10),transparent),linear-gradient(180deg,#05070d_0%,#0a0e1a_55%,#05070d_100%)] px-5 py-12 sm:-mx-10 sm:px-10 lg:-my-10">
      <PremiumIntro />

      <div className="mx-auto mt-8 max-w-[720px] text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f0c674]/30 bg-[#f0c674]/[.06] px-4 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.24em] text-[#f0c674]">
          Exclusive · Elite Athlete Coaching
        </span>
        <h1 className="display mt-5 text-[clamp(30px,5.5vw,48px)] text-white">
          1-on-1 Online Coaching
        </h1>
        <p className="mx-auto mt-4 max-w-[58ch] text-[16px] leading-relaxed text-white/60">
          A personalized coaching relationship built around one athlete — weekly mentorship,
          detailed film breakdowns, and a coach who actually knows this player&apos;s game.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-[880px] gap-5 sm:grid-cols-2">
        {featured.map((s) => {
          const unlocked = session.role === 'admin' || Boolean(session.permissions[s.relatedPermission]);
          return (
            <div
              key={s.key}
              className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-6 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="display text-[19px] text-white">{s.label}</h2>
                {unlocked ? (
                  <span className="shrink-0 rounded-full border border-[#f0c674]/40 bg-[#f0c674]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#f0c674]">
                    Included
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/50">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      aria-hidden="true"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    Locked
                  </span>
                )}
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/60">{s.description}</p>
              {!unlocked && (
                <Link
                  href="/custom#build"
                  className="mt-4 inline-flex text-[12.5px] font-semibold text-[#f0c674] hover:text-[#f6d896]"
                >
                  Unlock with Custom Plan →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-[880px] rounded-2xl border border-[#f0c674]/20 bg-[#f0c674]/[.04] px-6 py-5 text-center">
        <p className="text-[14px] leading-relaxed text-white/70">
          Athletes enrolled in a Custom Plan can reach out to their coach whenever they need
          additional guidance or support — that access is always included, never something you
          buy separately.
        </p>
      </div>

      <div className="mx-auto mt-10 flex max-w-[880px] flex-col items-center gap-3 text-center">
        <p className="text-[13.5px] text-white/50">
          Starting at <span className="font-bold text-white">{startingPriceDisplay}/month</span>{' '}
          for one option — build your exact plan on the next page.
        </p>
        <Link
          href="/custom#build"
          className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-gradient-to-b from-[#f6d896] to-[#d4a24e] px-8 py-3.5 text-[15px] font-bold text-[#1a1200] shadow-[0_12px_30px_-8px_rgba(240,198,116,0.5)] transition-transform hover:-translate-y-0.5"
        >
          Build Your Plan
        </Link>
      </div>
    </div>
  );
}
