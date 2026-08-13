import Link from 'next/link';
import { DEMO_MODE } from '@/lib/session';
import { signInAction } from '../actions';
import AuthForm from '@/components/auth/AuthForm';
import { Button } from '@/components/ui';

export const metadata = { title: 'Log in' };

const FIELD =
  'w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[15px] text-white placeholder:text-silver-dim/60';
const LABEL =
  'mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

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
          <h1 className="display text-[28px]">Welcome back</h1>
          <p className="mt-2 text-[14.5px] text-silver-dim">
            Log in to pick up where your player left off.
          </p>

          <AuthForm action={signInAction} label="Log in" pendingLabel="Logging in…">
            <input type="hidden" name="next" value={next ?? '/dashboard'} />
            <div>
              <label htmlFor="email" className={LABEL}>Email</label>
              <input id="email" name="email" type="email" autoComplete="email"
                     placeholder="you@email.com" required className={FIELD} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL}>Password</label>
              <input id="password" name="password" type="password"
                     autoComplete="current-password" placeholder="••••••••"
                     required className={FIELD} />
            </div>
          </AuthForm>

          <p className="mt-4 text-center text-[13px]">
            <Link href="/forgot-password" className="text-silver-dim underline underline-offset-4 hover:text-white">
              Forgot your password?
            </Link>
          </p>

          <p className="mt-4 text-center text-[13.5px] text-silver-dim">
            New here?{' '}
            <Link href="/signup?plan=basic" className="text-electric-glow underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>

        {DEMO_MODE && (
          <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-center">
            <p className="text-[12.5px] text-silver-dim">
              Demo mode — no database connected. Any credentials take you to the dashboard, and
              you can switch tier from the sidebar.
            </p>
            <div className="mt-3 flex justify-center">
              <Button href="/dashboard" variant="ghost" size="sm">Skip to the app</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
