import { requireSession } from '@/lib/session';
import { TIER_LABEL } from '@/lib/types';
import { planForTier } from '@/lib/plans';
import { Card, Eyebrow, Button } from '@/components/ui';
import BillingPortalButton from '@/components/BillingPortalButton';

export const metadata = { title: 'Account — Mindset Hockey' };

export default async function AccountPage() {
  const session = await requireSession();
  const plan = planForTier(session.tier);

  return (
    <div>
      <Eyebrow>Account</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Account &amp; billing</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h3 className="display text-[18px]">Profile</h3>
          <dl className="mt-4 grid gap-3 text-[14.5px]">
            <div className="flex justify-between gap-4">
              <dt className="text-silver-dim">Name</dt>
              <dd className="text-white">{session.fullName || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-silver-dim">Email</dt>
              <dd className="truncate text-white">{session.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-silver-dim">Role</dt>
              <dd className="capitalize text-white">{session.role}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[13.5px]">
            <a href="/account/password" className="text-electric-glow underline underline-offset-4">
              Change password
            </a>
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="display text-[18px]">Membership</h3>
          <dl className="mt-4 grid gap-3 text-[14.5px]">
            <div className="flex justify-between gap-4">
              <dt className="text-silver-dim">Plan</dt>
              <dd className="text-white">{TIER_LABEL[session.tier]}</dd>
            </div>
            {plan && (
              <div className="flex justify-between gap-4">
                <dt className="text-silver-dim">Monthly</dt>
                <dd className="text-white">${plan.monthly}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-silver-dim">Status</dt>
              <dd className={session.subscriptionActive ? 'text-[#3ddc84]' : 'text-amber'}>
                {session.subscriptionActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <BillingPortalButton />
            <Button href="/upgrade" variant="ghost" size="sm">
              {session.tier === 'premium' ? 'See Plans' : 'Upgrade'}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <h3 className="display text-[18px]">Your data</h3>
        <p className="mt-2 text-[14.5px] text-silver-dim">
          Videos you upload are private to you and the reviewing coach, and are never used in
          marketing without written consent. You can request deletion of any upload at any time
          by emailing{' '}
          <a href="mailto:braydencastiglia@gmail.com" className="text-electric-glow">
            braydencastiglia@gmail.com
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
