import { requireSession } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';
import RequestPlanForm from './RequestPlanForm';

export const metadata = { title: 'Request Custom Plan — Mindset Hockey' };

export default async function RequestCustomPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;

  return (
    <div>
      <Eyebrow>Custom Coaching</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Build a plan around this athlete</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Select whatever you&apos;re interested in — see the price update as you go, then check out
        right away. Not ready to commit? You can submit it as a request instead and a coach will
        follow up.
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

      <Card className="mt-8 p-6 sm:p-8">
        <RequestPlanForm />
      </Card>
    </div>
  );
}
