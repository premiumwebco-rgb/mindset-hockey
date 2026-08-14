/* ==========================================================================
   ONBOARDING EMAIL SEQUENCE  —  SERVER ONLY

   WHAT IS AND IS NOT BUILT HERE

   BUILT and real: explicit consent, the schedule, who is due what right now,
   the purchase-triggered stop, the frequency guard, and unsubscribe.

   NOT BUILT: actually sending. There is no email provider wired into this
   project — RESEND_API_KEY sits unused in .env.example and nothing reads it.
   `sendMarketingEmail` below is a single documented seam that throws rather
   than pretending. Nothing in this module claims a message was delivered.

   CONSENT RULES, IN PRIORITY ORDER
     1. marketing_opt_out_at set        -> never send, whatever else says
     2. marketing_opt_in false          -> never send
     3. otherwise                       -> send on schedule
   Transactional mail (password reset, receipts, security) is NOT governed by
   this module and is unaffected by opting out.
   ========================================================================== */

if (typeof window !== 'undefined') {
  throw new Error('lib/email/sequence.ts is server-only.');
}

export interface SequenceEmail {
  step: number;
  /** Days after signup this is due. */
  dayOffset: number;
  subject: string;
  /** What the message is for. Copy lives with the template, not here. */
  purpose: string;
}

/**
 * Six messages over 25 days, then nothing automatic.
 *
 * Deliberately front-loaded and then sparse: the gaps widen (0, 2, 3, 5, 7, 8
 * days) so it reads as helpful rather than as a drip campaign. After step 6
 * the sequence STOPS. There is no indefinite promotional loop.
 */
export const ONBOARDING_SEQUENCE: SequenceEmail[] = [
  { step: 1, dayOffset: 0, subject: 'Your 3 free AI Shot Analyses are ready', purpose: 'Welcome. How to film and upload a clip; what the analysis looks at.' },
  { step: 2, dayOffset: 2, subject: 'How to film a shot the analysis can actually read', purpose: 'Useful content: camera angle, distance, lighting. Reminder that free analyses are waiting.' },
  { step: 3, dayOffset: 5, subject: 'What the analysis can and cannot see', purpose: 'Honest explanation of the ten categories and footage limits. CTA to analyze another shot.' },
  { step: 4, dayOffset: 10, subject: 'Three things that quietly cost you shot power', purpose: 'Coaching content. Soft reminder of remaining analyses.' },
  { step: 5, dayOffset: 17, subject: 'Weekly analysis, and what a plan includes', purpose: 'Introduce Standard and Premium weekly allowances.' },
  { step: 6, dayOffset: 25, subject: 'Keep working on your shot', purpose: 'Final conversion reminder. Last message in the sequence.' },
];

/** Minimum gap between any two marketing emails, regardless of schedule. */
export const MIN_HOURS_BETWEEN_EMAILS = 24;

export interface SequenceProfile {
  id: string;
  marketing_opt_in: boolean;
  marketing_opt_out_at: string | null;
  onboarding_sequence_started_at: string | null;
  onboarding_email_step: number;
  last_marketing_email_at: string | null;
  /** Any paid tier stops the free-user promotional sequence. */
  tier: string;
  subscription_active: boolean;
}

/**
 * The next email due for this member, or null.
 *
 * Returns null — meaning send nothing — when:
 *   - they never opted in, or have unsubscribed
 *   - the sequence has not started, or is finished
 *   - the next step is not due yet
 *   - one was sent too recently
 *   - THEY HAVE BOUGHT A PLAN. A paying member must not keep receiving
 *     "upgrade to a paid plan" email; that is the most damaging thing an
 *     onboarding sequence can get wrong.
 */
export function nextDueEmail(
  profile: SequenceProfile,
  now: Date = new Date()
): SequenceEmail | null {
  if (profile.marketing_opt_out_at) return null;
  if (!profile.marketing_opt_in) return null;

  // Purchase-triggered stop.
  const hasPaidPlan =
    profile.subscription_active && (profile.tier === 'basic' || profile.tier === 'premium');
  if (hasPaidPlan) return null;

  if (!profile.onboarding_sequence_started_at) return null;

  const next = ONBOARDING_SEQUENCE.find((e) => e.step === profile.onboarding_email_step + 1);
  if (!next) return null; // sequence complete

  const started = new Date(profile.onboarding_sequence_started_at).getTime();
  if (!Number.isFinite(started)) return null;

  const dueAt = started + next.dayOffset * 24 * 60 * 60 * 1000;
  if (now.getTime() < dueAt) return null;

  if (profile.last_marketing_email_at) {
    const since = now.getTime() - new Date(profile.last_marketing_email_at).getTime();
    if (since < MIN_HOURS_BETWEEN_EMAILS * 60 * 60 * 1000) return null;
  }

  return next;
}

/**
 * THE SEAM WHERE AN EMAIL PROVIDER GOES.
 *
 * Deliberately throws. If it silently returned success, the scheduler would
 * advance `onboarding_email_step` for messages that were never delivered, and
 * the database would claim a member had been emailed when they had not.
 *
 * To enable email: set RESEND_API_KEY, verify a sending domain (SPF + DKIM),
 * and replace the body of this function with the provider call. Every
 * marketing message must include the unsubscribe URL from
 * `unsubscribeUrl()` — it is a legal requirement, not a nicety.
 */
export async function sendMarketingEmail(_args: {
  to: string;
  subject: string;
  html: string;
}): Promise<never> {
  throw new Error(
    'No email provider is configured. Set RESEND_API_KEY and implement sendMarketingEmail() in lib/email/sequence.ts.'
  );
}

/** One-click unsubscribe link. Token is per-account and unguessable. */
export function unsubscribeUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindsethockey.com';
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}
