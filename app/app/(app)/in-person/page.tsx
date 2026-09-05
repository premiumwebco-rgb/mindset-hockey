import { requireSession } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';
import WaitlistForm from './WaitlistForm';

export const metadata = { title: 'In-Person Training — Mindset Hockey' };

/* ==========================================================================
   IN-PERSON TRAINING — SUMMER WAITLISTS (Capital Clubhouse)

   No full registration/booking system exists yet, so this is deliberately
   just an interest/waitlist collector, same shape as the Request Custom Plan
   flow: a member submits a row through their own session (RLS-enforced),
   and a coach follows up. Both sidebar links (Summer Training Waitlist /
   Summer Camp Waitlist) point here at #summer-training / #summer-camp so
   either entry point lands directly on the right form.
   ========================================================================== */

export default async function InPersonTrainingPage() {
  await requireSession();

  return (
    <div>
      <Eyebrow>In-Person Training</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Summer waitlists at Capital Clubhouse</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Summer Training and Summer Camps run in person at Capital Clubhouse. Registration isn&apos;t
        open yet — join a waitlist below and a coach will follow up with dates and pricing as soon
        as it is.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div id="summer-training" className="scroll-mt-24">
          <Card className="p-6 sm:p-7">
            <h2 className="display text-[19px]">Summer Training</h2>
            <p className="mt-1.5 text-[13.5px] text-silver-dim">📍 In person at Capital Clubhouse</p>
            <WaitlistForm program="summer_training" />
          </Card>
        </div>

        <div id="summer-camp" className="scroll-mt-24">
          <Card className="p-6 sm:p-7">
            <h2 className="display text-[19px]">Summer Camps</h2>
            <p className="mt-1.5 text-[13.5px] text-silver-dim">📍 In person at Capital Clubhouse</p>
            <WaitlistForm program="summer_camp" />
          </Card>
        </div>
      </div>
    </div>
  );
}
