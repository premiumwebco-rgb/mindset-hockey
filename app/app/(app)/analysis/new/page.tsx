import Link from 'next/link';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { Eyebrow } from '@/components/ui';
import UploadAnalyzer from './UploadAnalyzer';
import BuyAnalysis from './BuyAnalysis';
import { ANALYSIS_ADDON, analysisAddonAvailable } from '@/lib/plans';

export const metadata = { title: 'Analyze a Shot — Mindset Hockey' };

export default async function NewAnalysis({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const sp = await searchParams;
  // Included with both Standard and Premium. A member without an active
  // subscription is redirected to /upgrade by this guard, and would be blocked
  // by RLS even if they got past it.
  const session = await requireFeature('ai_shot_analysis');

  // Whether a vision provider is actually configured on this deployment. Read
  // server-side only — this is a boolean about the environment, never the key
  // itself, so nothing secret reaches the browser.
  //
  // Told up front rather than after the member has waited through a 200 MB
  // upload: without a provider the clip still uploads and still reaches a
  // coach, but no automated scoring happens, and saying so beforehand is the
  // honest thing to do.
  const { analyzerConfigured } = await import('@/lib/ai/analyzer');
  const aiAvailable = !DEMO_MODE && analyzerConfigured();

  // Weekly allowance, read-only — reserving happens server-side in the run
  // route, never here. Showing this before the upload means a member is never
  // surprised by a refusal after waiting through a 200 MB transfer.
  let allowance: {
    used: number;
    limit: number;
    remaining: number;
    freeRemaining: number;
    purchasedRemaining: number;
    totalRemaining: number;
    resetsAt: string;
  } | null = null;
  if (!DEMO_MODE) {
    const [{ createAdminClient }, { getQuotaState }] = await Promise.all([
      import('@/lib/supabase/server'),
      import('@/lib/ai/quota'),
    ]);
    const admin = await createAdminClient();
    const { data: profileRow } = await admin
      .from('profiles')
      .select('created_at')
      .eq('id', session.userId)
      .single();

    const state = await getQuotaState(admin, {
      profileId: session.userId,
      tier: session.tier,
      isAdmin: session.role === 'admin',
      accountCreatedAt: (profileRow?.created_at as string | undefined) ?? null,
    });
    if (Number.isFinite(state.limit)) {
      allowance = {
        used: state.used,
        limit: state.limit,
        remaining: state.remaining,
        freeRemaining: state.freeRemaining,
        purchasedRemaining: state.purchasedRemaining,
        totalRemaining: state.totalRemaining,
        resetsAt: state.resetsAt,
      };
    }
  }

  // Never render a purchase button that cannot complete a purchase.
  const addonAvailable = analysisAddonAvailable();

  const resetLabel = allowance
    ? new Date(allowance.resetsAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>AI Shot Analysis</Eyebrow>
          <h1 className="display text-[clamp(28px,5vw,44px)]">Analyze a shot</h1>
        </div>
        <Link
          href="/analysis"
          className="text-[14px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
        >
          Back to history
        </Link>
      </div>

      <p className="mt-3 max-w-[64ch] text-[16px] text-silver">
        Upload a clip, confirm what we are looking at, and the shot gets graded against ten
        mechanics categories.
      </p>

      {DEMO_MODE ? (
        <div className="mt-8 rounded-xl border border-dashed border-amber/40 bg-amber/[.06] px-6 py-8">
          <h2 className="display text-[20px] text-amber">Demo mode</h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] text-silver">
            Uploads and analysis need a real backend. Connect Supabase and set an AI provider key
            in <code className="text-white">.env.local</code>, then restart the dev server. Nothing
            here fabricates a sample result to fill the screen.
          </p>
        </div>
      ) : (
        <>
          {/* Returning from Stripe. The entitlement itself comes only from the
              verified webhook, so this says "shortly" rather than claiming the
              analysis is already banked. */}
          {sp.purchase === 'success' && (
            <div className="mt-6 rounded-xl border border-[#3ddc84]/40 bg-[#3ddc84]/[.07] px-5 py-4">
              <p className="text-[14.5px] font-semibold text-[#3ddc84]">Payment received.</p>
              <p className="mt-1 text-[13.5px] text-silver">
                Your additional analysis will appear shortly — refresh this page if it has not
                showed up in a moment.
              </p>
            </div>
          )}
          {sp.purchase === 'cancelled' && (
            <div className="mt-6 rounded-xl border border-white/[.12] bg-navy-900/50 px-5 py-4">
              <p className="text-[14px] text-silver">
                That purchase was cancelled — you were not charged.
              </p>
            </div>
          )}

          {/* FREE ACCOUNT: no weekly allowance, only the 3 signup credits. */}
          {allowance && allowance.limit === 0 && (
            <div
              className={`mt-6 rounded-xl border px-5 py-4 ${
                allowance.freeRemaining > 0
                  ? 'border-[#3ddc84]/40 bg-[#3ddc84]/[.07]'
                  : 'border-amber/40 bg-amber/[.07]'
              }`}
            >
              {allowance.freeRemaining > 0 ? (
                <>
                  <p className="text-[14.5px] font-semibold text-white">
                    You have {allowance.freeRemaining} free AI Shot{' '}
                    {allowance.freeRemaining === 1 ? 'Analysis' : 'Analyses'} available.
                  </p>
                  <p className="mt-1 text-[13.5px] text-silver-dim">
                    Free with your account — no card needed. Upload a clip and see what the
                    footage supports.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14.5px] font-semibold text-amber">
                    You&apos;ve used your 3 free AI Shot Analyses.
                  </p>
                  {allowance.purchasedRemaining > 0 ? (
                    <p className="mt-1 text-[13.5px] text-silver">
                      {allowance.purchasedRemaining} purchased{' '}
                      {allowance.purchasedRemaining === 1 ? 'analysis' : 'analyses'} available.
                    </p>
                  ) : (
                    <p className="mt-1 text-[13.5px] text-silver-dim">
                      Choose a plan for a weekly allowance, or buy a single analysis.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href="/upgrade"
                      className="inline-flex items-center justify-center rounded-[10px] bg-electric px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-glow"
                    >
                      See plans
                    </a>
                    {addonAvailable ? (
                      <BuyAnalysis price={ANALYSIS_ADDON.display} />
                    ) : (
                      <p className="text-[13px] text-silver-dim">
                        Single analyses at {ANALYSIS_ADDON.display} are coming soon.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {allowance && allowance.limit > 0 && (
            <div
              className={`mt-6 rounded-xl border px-5 py-4 ${
                allowance.totalRemaining === 0
                  ? 'border-amber/40 bg-amber/[.07]'
                  : 'border-white/[.10] bg-navy-900/50'
              }`}
            >
              {allowance.remaining === 0 ? (
                <>
                  <p className="text-[14.5px] font-semibold text-amber">
                    You&apos;ve used all of your included AI Shot Analyses this week.
                  </p>
                  {allowance.purchasedRemaining > 0 ? (
                    <p className="mt-1 text-[13.5px] text-silver">
                      <span className="font-semibold text-white">
                        {allowance.purchasedRemaining} additional{' '}
                        {allowance.purchasedRemaining === 1 ? 'analysis' : 'analyses'} available.
                      </span>{' '}
                      Your included allowance resets on {resetLabel}.
                    </p>
                  ) : (
                    <p className="mt-1 text-[13.5px] text-silver-dim">
                      Your allowance resets on {resetLabel}. You can still upload a clip — it will
                      be saved and sent to a coach for a manual breakdown.
                    </p>
                  )}
                  <div className="mt-4">
                    {addonAvailable ? (
                      <BuyAnalysis price={ANALYSIS_ADDON.display} />
                    ) : (
                      <p className="text-[13px] text-silver-dim">
                        Need one sooner? Single analyses at {ANALYSIS_ADDON.display} are coming
                        soon.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[14.5px] text-silver">
                      <span className="font-semibold text-white">
                        {allowance.used} of {allowance.limit}
                      </span>{' '}
                      included analyses used this week
                    </p>
                    <p className="text-[13.5px] font-semibold text-electric-glow">
                      {allowance.remaining} included{' '}
                      {allowance.remaining === 1 ? 'analysis' : 'analyses'} remaining
                    </p>
                  </div>
                  <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-navy-700"
                    role="img"
                    aria-label={`${allowance.used} of ${allowance.limit} included weekly analyses used`}
                  >
                    <div
                      className="h-full rounded-full bg-electric transition-[width] duration-500"
                      style={{ width: `${(allowance.used / allowance.limit) * 100}%` }}
                    />
                  </div>
                  {allowance.purchasedRemaining > 0 && (
                    <p className="mt-2 text-[13px] text-silver">
                      {allowance.purchasedRemaining} additional{' '}
                      {allowance.purchasedRemaining === 1 ? 'analysis' : 'analyses'} available ·{' '}
                      <span className="font-semibold text-white">
                        {allowance.totalRemaining} total
                      </span>
                    </p>
                  )}
                  <p className="mt-2 text-[12.5px] text-silver-dim">Resets on {resetLabel}.</p>
                </>
              )}
            </div>
          )}

          {!aiAvailable && (
            <div className="mt-8 rounded-xl border border-amber/40 bg-amber/[.07] px-6 py-5">
              <h2 className="display text-[19px] text-amber">
                Automated scoring is switched off right now
              </h2>
              <p className="mt-2 max-w-[64ch] text-[14.5px] text-silver">
                No vision provider is configured on this deployment, so your clip will not be graded
                automatically. You can still upload it — it will be stored privately and sent
                straight to a coach for a manual breakdown.
              </p>
              <p className="mt-2 max-w-[64ch] text-[13.5px] text-silver-dim">
                We would rather tell you that now than take your upload and show you invented
                scores.
              </p>
            </div>
          )}
          <div className="mt-8">
            <UploadAnalyzer aiAvailable={aiAvailable} />
          </div>
        </>
      )}
    </div>
  );
}
