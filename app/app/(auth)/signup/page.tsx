import Link from 'next/link';
import { PLANS, planFromParam } from '@/lib/plans';
import { Button } from '@/components/ui';
import AuthForm from '@/components/auth/AuthForm';
import { signUpAction } from '../actions';

export const metadata = { title: 'Create your account' };

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  // Route boundary: `?plan=` may be a public slug or a legacy tier alias.
  // planFromParam is the one place that translation is allowed to happen.
  const selected = planFromParam(plan) ?? PLANS[0];

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
            {`$${selected.setupFee} one-time setup, then $${selected.monthly}/month. No contract — cancel the monthly any time.`}
          </p>
          <p className="mt-2 text-[13px] text-silver-dim">
            Create your account first — payment is the next step, and nothing is charged until
            you confirm it in Stripe.
          </p>

          <AuthForm action={signUpAction} label="Create Account" pendingLabel="Creating account…">
            {/* Carries the chosen plan into signUpAction so the member lands on
                checkout rather than a generic dashboard. Always the public slug. */}
            <input type="hidden" name="plan" value={selected.slug} />
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

            {/* Explicit, unticked opt-IN. Declining does NOT block signup and
                does NOT affect the 3 free analyses. Account, security and
                payment email is transactional and sent regardless. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.10] bg-ink px-4 py-3.5">
              <input
                type="checkbox"
                name="marketing_opt_in"
                value="true"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A84FF]"
              />
              <span className="text-[13px] leading-relaxed text-silver-dim">
                Yes, send me hockey tips, AI Shot Analysis updates, product news and occasional
                offers. You can unsubscribe from any email in one click.
              </span>
            </label>
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
