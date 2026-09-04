import { requireSession } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';
import RequestPlanForm from './RequestPlanForm';

export const metadata = { title: 'Request Custom Plan — Mindset Hockey' };

export default async function RequestCustomPlanPage() {
  await requireSession();

  return (
    <div>
      <Eyebrow>Custom Coaching</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Build a plan around this athlete</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Select whatever you&apos;re interested in — this isn&apos;t a checkout, it&apos;s a
        request. A coach will follow up to put together pricing and a plan, and your submission
        shows up in our admin dashboard right away.
      </p>

      <Card className="mt-8 p-6 sm:p-8">
        <RequestPlanForm />
      </Card>
    </div>
  );
}
