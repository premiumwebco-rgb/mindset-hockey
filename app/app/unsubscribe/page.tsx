import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/session';

export const metadata = { title: 'Unsubscribed — Mindset Hockey' };
export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe.
 *
 * NO LOGIN REQUIRED — a member who no longer wants email must not have to
 * remember a password to stop it, and requiring one is a good way to earn a
 * spam complaint instead of an unsubscribe.
 *
 * The token is a per-account random uuid with a unique index. It identifies
 * the account and nothing else: it grants no session, exposes no personal
 * data, and cannot be used to read or change anything other than this one
 * preference. A wrong or missing token is reported as "we could not find that
 * link" rather than confirming whether it exists.
 *
 * Opting out is recorded with a timestamp and takes effect immediately —
 * `nextDueEmail()` refuses to send anything once marketing_opt_out_at is set.
 * Transactional mail (receipts, password resets, security) is unaffected, as
 * the page states plainly.
 */
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let ok = false;

  if (token && !DEMO_MODE) {
    const admin = await createAdminClient();
    // Service-role: members have no write policy on these columns for other
    // accounts, and this runs without a session by design.
    const { data } = await admin
      .from('profiles')
      .update({
        marketing_opt_in: false,
        marketing_opt_out_at: new Date().toISOString(),
      })
      .eq('unsubscribe_token', token)
      .select('id')
      .maybeSingle();
    ok = Boolean(data);
  }

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-[520px] text-center">
        <Link href="/" className="mb-10 inline-flex flex-col items-center leading-[.85]">
          <b className="display text-[24px]">MINDSET</b>
          <span className="pl-px text-[10px] font-semibold tracking-[.42em] text-silver-dim">
            HOCKEY
          </span>
        </Link>

        {ok ? (
          <>
            <h1 className="display text-[28px]">You&apos;re unsubscribed</h1>
            <p className="mt-3 text-[15px] text-silver">
              You won&apos;t receive any more marketing email from us. That took effect
              immediately — nothing further is queued.
            </p>
            <p className="mt-3 text-[13.5px] text-silver-dim">
              You&apos;ll still get essential account email such as password resets and payment
              receipts. Those aren&apos;t marketing and can&apos;t be switched off while you have an
              account.
            </p>
          </>
        ) : (
          <>
            <h1 className="display text-[28px]">We couldn&apos;t find that link</h1>
            <p className="mt-3 text-[15px] text-silver">
              That unsubscribe link looks expired or incomplete. Email{' '}
              <a
                href="mailto:braydencastiglia@gmail.com"
                className="text-electric-glow underline underline-offset-4"
              >
                braydencastiglia@gmail.com
              </a>{' '}
              and we&apos;ll remove you by hand the same day.
            </p>
          </>
        )}

        <p className="mt-8 text-[13.5px]">
          <Link href="/" className="text-silver-dim underline underline-offset-4 hover:text-white">
            Back to Mindset Hockey
          </Link>
        </p>
      </div>
    </div>
  );
}
