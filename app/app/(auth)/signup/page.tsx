import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import { Button } from '@/components/ui';
import AuthForm from '@/components/auth/AuthForm';
import { signUpAction } from '../actions';
import type { Tier } from '@/lib/types';

export const metadata = { title: 'Create your account' };

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const tier = (plan as Tier) || 'basic';
  const selected = PLANS.find((p) => p.tier === tier) ?? PLANS[0];

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-[460px]">
        <Link href="/" className="mb-10 flex flex-col items-center leading-[.85]">
          <b className="display text-[24px]">MINDSET</b>
          <span className="pl-px text-[10px] font-semibold tracking-[.42em] text-silver-dim">
            HOCKEY
          </span>
        </Link>

        <div className="card p-8">
          <p className="eyebrow mb-3">{selected.name}</p>
          <h1 className="display text-[28px]">
            {`Create your account`}
          </h1>
          <p className="mt-2 text-[14.5px] text-silver-dim">
            {tier === 'premium'
              ? `$${selected.setupFee} one-time setup, then $${selected.monthly}/month. No contract — cancel the monthly any time.`
              : `$${selected.setupFee} one-time setup, then $${selected.monthly}/month. No contract — cancel the monthly any time.`}
          </p>

          <AuthForm action={signUpAction} label="Create Account" pendingLabel="Creating account…">
            <div>
              <label htmlFor="name" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Your name
              </label>
              <input id="name" name="name" placeholder="Parent or player" required />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Email
              </label>
              <input id="email" name="email" type="email" placeholder="you@email.com" required />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Password
              </label>
              <input id="password" name="password" type="password" placeholder="8+ characters" required />
            </div>
          </AuthForm>

          <p className="mt-4 text-center text-[12px] text-silver-dim">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2">terms</Link> and{' '}
            <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
          </p>

          <p className="mt-5 text-center text-[13.5px] text-silver-dim">
            Already a member?{' '}
            <Link href="/login" className="text-electric-glow underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[12px] text-silver-dim">
          Individual results vary. No platform can guarantee placement at any level of hockey.
        </p>
      </div>
    </div>
  );
}
