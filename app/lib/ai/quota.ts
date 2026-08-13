/* ==========================================================================
   USAGE QUOTA  —  SERVER ONLY

   Every analysis costs real money at the vision API. The previous
   implementation had no limiting whatsoever, which is a standing invitation to
   a surprise bill.

   Limits are configurable via env (see lib/ai/config.ts) rather than
   hard-coded, and setting either to 0 disables it. They are counted from the
   `ai_usage` ledger, not from shot_analyses, so deleting an analysis does not
   refund quota.
   ========================================================================== */

import { ANALYSES_PER_DAY, ANALYSES_PER_MONTH } from './config';

if (typeof window !== 'undefined') {
  throw new Error('lib/ai/quota.ts is server-only and was imported from client code.');
}

type AdminClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createAdminClient>>;

export interface QuotaState {
  allowed: boolean;
  reason?: string;
  usedToday: number;
  usedThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
}

/**
 * Reads current usage. Admins bypass limits entirely — they need to be able to
 * test the pipeline without burning a member-sized quota.
 */
export async function checkQuota(
  admin: AdminClient,
  profileId: string,
  isAdmin: boolean
): Promise<QuotaState> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: today }, { count: month }] = await Promise.all([
    admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .gte('created_at', dayStart),
    admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .gte('created_at', monthStart),
  ]);

  const usedToday = today ?? 0;
  const usedThisMonth = month ?? 0;

  const base: QuotaState = {
    allowed: true,
    usedToday,
    usedThisMonth,
    dailyLimit: ANALYSES_PER_DAY,
    monthlyLimit: ANALYSES_PER_MONTH,
  };

  if (isAdmin) return base;

  if (ANALYSES_PER_DAY > 0 && usedToday >= ANALYSES_PER_DAY) {
    return {
      ...base,
      allowed: false,
      reason: `You have used all ${ANALYSES_PER_DAY} analyses for today. The limit resets at midnight.`,
    };
  }

  if (ANALYSES_PER_MONTH > 0 && usedThisMonth >= ANALYSES_PER_MONTH) {
    return {
      ...base,
      allowed: false,
      reason: `You have used all ${ANALYSES_PER_MONTH} analyses for this month.`,
    };
  }

  return base;
}

/**
 * Records an attempt. Written with the service-role client because members
 * must not be able to write (and therefore forge) their own usage rows.
 * Called for failures too — a failed call still costs tokens.
 */
export async function recordUsage(
  admin: AdminClient,
  args: {
    profileId: string;
    analysisId: string | null;
    model: string | null;
    frameCount: number;
    succeeded: boolean;
  }
): Promise<void> {
  const { error } = await admin.from('ai_usage').insert({
    profile_id: args.profileId,
    analysis_id: args.analysisId,
    model: args.model,
    frame_count: args.frameCount,
    succeeded: args.succeeded,
  });
  // Never fail the request over telemetry.
  if (error) console.error('[ai_usage] could not record usage:', error.message);
}
