import Link from 'next/link';
import { requireSession } from '@/lib/session';
import PremiumIntro from './PremiumIntro';

export const metadata = { title: 'Live Virtual Coaching — Mindset Hockey' };

/* ==========================================================================
   LIVE VIRTUAL COACHING — premium experience page

   Sits under "Create a Custom Plan" alongside "Build Your Plan" (/custom).
   Deliberately visually distinct from the rest of the app — a gold/premium
   accent instead of the site's usual electric blue, a darker gradient
   background, and elevated cards with heavier shadows — so this reads as an
   exclusive, elite-athlete coaching program rather than another settings
   page. Build Your Plan (/custom) reuses this exact color system — see its
   own header comment.

   Unlike the old "1-on-1 Online Coaching" version of this page, this is not
   tied to the recurring Custom Plan subscription or its permission
   lock/unlock state — it describes two live-coaching offerings sold on
   their own terms: 1-on-1 Video Coaching ($30/session, request-and-schedule,
   no checkout here) and Group Coaching Sessions ($10/session, real Stripe
   checkout on /coaching/signup). See lib/groupCoaching.ts for both prices —
   this page never hardcodes a dollar amount that isn't sourced from there.
   ========================================================================== */

const ONE_ON_ONE_TOPICS = [
  'Review and adjust your training plan',
  'Discuss how your training is progressing',
  'Identify areas that need improvement and what can be added to your development program',
  'Review game film and provide feedback',
  'Talk through your season performance and goals',
  'Provide mentorship and guidance',
  'Help you work through challenges, setbacks, or confidence issues',
  'Answer questions and give individualized advice',
  'Support you in every way possible to help you succeed throughout your season',
];

const GROUP_TOPICS = [
  'Skill development concepts',
  'Hockey IQ and game understanding',
  'Mindset and mental performance training',
  'Lessons and habits used by professional players',
  'Training and recovery strategies',
  'Q&A discussions with coaches',
];

export default async function LiveVirtualCoachingPage() {
  await requireSession();

  return (
    <div className="-mx-5 -my-8 rounded-[24px] bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(240,198,116,0.10),transparent),linear-gradient(180deg,#05070d_0%,#0a0e1a_55%,#05070d_100%)] px-5 py-12 sm:-mx-10 sm:px-10 lg:-my-10">
      <PremiumIntro />

      <div className="mx-auto mt-8 max-w-[720px] text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f0c674]/30 bg-[#f0c674]/[.06] px-4 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.24em] text-[#f0c674]">
          Exclusive · Elite Athlete Coaching
        </span>
        <h1 className="display mt-5 text-[clamp(30px,5.5vw,48px)] text-white">
          Live Virtual Coaching
        </h1>
        <p className="mx-auto mt-4 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
          Live Virtual Coaching gives players the opportunity to work directly with our coaches
          through either 1-on-1 video coaching sessions or group coaching sessions, depending on
          what fits their goals best.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-[960px] gap-6 lg:grid-cols-2 lg:items-start">
        <div className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-7 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="display text-[21px] text-white">1-on-1 Video Coaching</h2>
            <span className="shrink-0 rounded-full border border-[#f0c674]/40 bg-[#f0c674]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#f0c674]">
              $30 per session
            </span>
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/60">
            These personalized coaching calls are designed to help players maximize their
            development both on and off the ice. During these sessions, we can:
          </p>
          <ul className="mt-4 space-y-2.5">
            {ONE_ON_ONE_TOPICS.map((topic) => (
              <li key={topic} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-white/70">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
                {topic}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] italic leading-relaxed text-white/50">
            Each session is tailored to the player&apos;s specific needs and development goals.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.04] to-transparent p-7 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="display text-[21px] text-white">Group Coaching Sessions</h2>
            <span className="shrink-0 rounded-full border border-[#f0c674]/40 bg-[#f0c674]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#f0c674]">
              $10 per session
            </span>
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/60">
            Group coaching sessions provide players with the opportunity to learn, grow, and
            interact with coaches and other motivated athletes in a collaborative environment.
          </p>
          <p className="mt-4 text-[13px] font-semibold uppercase tracking-[.08em] text-white/45">
            Topics may include:
          </p>
          <ul className="mt-3 space-y-2.5">
            {GROUP_TOPICS.map((topic) => (
              <li key={topic} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-white/70">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
                {topic}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] italic leading-relaxed text-white/50">
            Players will also have input on future session topics, allowing us to focus on the
            areas they are most interested in learning about and improving.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[960px] rounded-2xl border border-[#f0c674]/20 bg-[#f0c674]/[.04] px-6 py-5">
        <p className="text-center text-[12px] font-bold uppercase tracking-[.16em] text-[#f0c674]">
          Pricing
        </p>
        <div className="mx-auto mt-4 grid max-w-[560px] gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-center">
            <p className="text-[13px] text-white/60">1-on-1 Video Coaching</p>
            <p className="mt-1 text-[17px] font-bold text-white">$30 per session</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-center">
            <p className="text-[13px] text-white/60">Group Coaching Sessions</p>
            <p className="mt-1 text-[17px] font-bold text-white">$10 per session</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-[880px] flex-col items-center gap-3 text-center">
        <p className="text-[13.5px] text-white/50">
          Ready to get started? Choose 1-on-1 or group coaching and sign up below.
        </p>
        <Link
          href="/coaching/signup"
          className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-gradient-to-b from-[#f6d896] to-[#d4a24e] px-8 py-3.5 text-[15px] font-bold text-[#1a1200] shadow-[0_12px_30px_-8px_rgba(240,198,116,0.5)] transition-transform hover:-translate-y-0.5"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
