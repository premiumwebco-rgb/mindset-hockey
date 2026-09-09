import { requirePermission } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';

export const metadata = { title: 'Weekly Check-Ins — Mindset Hockey' };

/* ==========================================================================
   WEEKLY CHECK-INS — one of the 4 Personalized Plan tabs (see
   lib/permissions.ts CUSTOM_COACHING_SERVICES). Gated by the same
   'weekly_checkins' permission column CUSTOM_COACHING_SERVICES already maps
   this option to — an admin grants it exactly the way every other Custom
   Plan option is granted (Admin > Plan Management, or a Build Your Plan
   purchase). No new scheduling system: this reuses the app's existing
   direct-contact pattern (the same "reach out to your coach" pattern used
   elsewhere) rather than building a duplicate calendar/booking system.
   ========================================================================== */

export default async function WeeklyCheckInsPage() {
  await requirePermission('weekly_checkins');

  return (
    <div>
      <Eyebrow>Personalized Plan</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Weekly Check-Ins</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        A recurring weekly call to review your progress, answer questions, and keep your training
        on track.
      </p>

      <Card className="mt-8 max-w-[560px] p-6 sm:p-8">
        <h2 className="display text-[20px]">Schedule Your Weekly Check-In</h2>
        <p className="mt-2 text-[14.5px] text-silver-dim">
          Text or call to pick a day and time that works for you each week.
        </p>
        <div className="mt-5 grid gap-3">
          <a
            href="tel:12404356511"
            className="flex items-center justify-between rounded-xl border border-electric/40 bg-electric/[.06] px-4 py-3.5 transition-colors hover:border-electric"
          >
            <span>
              <span className="block text-[13px] font-semibold text-white">Brayden</span>
              <span className="block text-[12px] text-silver-dim">Tap to call or text</span>
            </span>
            <span className="text-[15px] font-bold text-white">240-435-6511</span>
          </a>
          <a
            href="tel:13012473284"
            className="flex items-center justify-between rounded-xl border border-electric/40 bg-electric/[.06] px-4 py-3.5 transition-colors hover:border-electric"
          >
            <span>
              <span className="block text-[13px] font-semibold text-white">Jack</span>
              <span className="block text-[12px] text-silver-dim">Tap to call or text</span>
            </span>
            <span className="text-[15px] font-bold text-white">301-247-3284</span>
          </a>
        </div>
      </Card>
    </div>
  );
}
