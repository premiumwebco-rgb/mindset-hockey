import { requireSession } from '@/lib/session';
import { updatePasswordAction } from '@/app/(auth)/actions';
import AuthForm from '@/components/auth/AuthForm';
import { Card, Eyebrow } from '@/components/ui';

export const metadata = { title: 'Set a new password' };

const FIELD =
  'w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[15px] text-white';
const LABEL =
  'mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim';

export default async function PasswordPage() {
  await requireSession();

  return (
    <div className="max-w-[480px]">
      <Eyebrow>Account</Eyebrow>
      <h1 className="display text-[clamp(26px,4.5vw,38px)]">Set a new password</h1>

      <Card className="mt-7 p-7">
        <AuthForm action={updatePasswordAction} label="Update password" pendingLabel="Updating…">
          <div>
            <label htmlFor="password" className={LABEL}>New password</label>
            <input id="password" name="password" type="password" minLength={8}
                   autoComplete="new-password" required className={FIELD} />
          </div>
          <div>
            <label htmlFor="confirm" className={LABEL}>Confirm password</label>
            <input id="confirm" name="confirm" type="password" minLength={8}
                   autoComplete="new-password" required className={FIELD} />
          </div>
        </AuthForm>
      </Card>
    </div>
  );
}
