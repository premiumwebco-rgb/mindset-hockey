'use client';

/* ==========================================================================
   PREMIUM LOGO INTRO

   Plays once per visit to this page: the Mindset Hockey wordmark fades in
   and scales up slightly (opacity 0 -> 1, scale 0.92 -> 1), ~1.6s, ease-out.
   Client component so the animation is driven by CSS from the moment this
   page mounts — since Next's App Router mounts a fresh instance of this
   component on every navigation INTO this route, the animation naturally
   "only plays when entering the tab": it never replays on scroll, re-render,
   or anything happening on the page after mount, only on arrival.

   Respects prefers-reduced-motion — the keyframes are skipped entirely for
   anyone who has that set, landing straight on the final state.
   ========================================================================== */

export default function PremiumIntro() {
  return (
    <div className="premium-logo-intro text-center">
      <style>{`
        @keyframes premiumLogoIn {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        .premium-logo-intro .premium-logo-mark {
          opacity: 0;
          animation: premiumLogoIn 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-logo-intro .premium-logo-mark {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <div className="premium-logo-mark inline-flex flex-col items-center leading-[.85]">
        <b className="display text-[15px] font-extrabold tracking-[.5em] text-[#f0c674]">
          MINDSET
        </b>
        <span className="mt-2 text-[10px] font-bold tracking-[.55em] text-white/60">HOCKEY</span>
      </div>
    </div>
  );
}
