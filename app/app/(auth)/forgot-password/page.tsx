import Link from 'next/link';
import { requestPasswordResetAction } from '../actions';
import AuthForm from '@/components/auth/AuthForm';

export const metadata = { title: 'Reset your password' };

export default function ForgotPassword() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-10 flex flex-col items-center leading-[.85]">
          <b className="display text-[24px]">MINDSET</b>
          <span className="pl-px text-[10px] font-semibold tracking-[.42em] text-silver-dim">
            HOCKEY
          </span>
        </Link>

        <div className="card p-8">
          <h1 className="display text-[28px]">Reset your password</h1>
          <p className="mt-2 text-[14.5px] text-silver-dim">
            Enter your email and we&apos;ll send a link to set a new one.
          </p>

          <AuthForm
            action={requestPasswordResetAction}
            label="Send reset link"
            pendingLabel="Sending…"
          >
            <div>
              <label htmlFor="email"
                     className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email"
                     placeholder="you@email.com" required
                     className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[15px] text-white placeholder:text-silver-dim/60" />
            </div>
          </AuthForm>

          <p className="mt-5 text-center text-[13.5px] text-silver-dim">
            <Link href="/login" className="text-electric-glow underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
