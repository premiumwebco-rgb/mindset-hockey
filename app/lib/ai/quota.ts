/* ==========================================================================
   AI SHOT ANALYSIS — WEEKLY ENTITLEMENT  (SERVER ONLY)

   Two independent layers, checked in order. Either can refuse:

     1. Global kill switch          AI_ENABLED=false stops everything
     2. Player weekly allowance     tier-aware, from AI_ANALYSIS_LIMITS

   THERE IS NO GLOBAL ANALYSIS-COUNT LIMIT. An earlier version had one
   (AI_GLOBAL_WEEKLY_MAX = 500), which mistook a ~$500/month provider BUDGET
   for a cap of 500 analyses — different units, and it would have throttled
   members nowhere near the spend. Cost is now tracked in dollars and tokens
   (see commitReservation) and controlled by the operator via the kill switch,
   not by silently capping how many analyses customers may run.

   WHY WEEKLY, AND WHY NOT THE CALENDAR
   The allowance is a coaching rhythm, not a billing artefact. Stripe decides
   whether a subscription is active and what tier it is; it does not decide the
   AI period. Nothing here resets on the 1st of the month.

   The window is a ROLLING 7-day period anchored to the player's own account
   creation date, so it resets on their personal weekday rather than everyone's
   allowance refilling at midnight on Monday (which would spike provider load
   into one hour every week). It is derived, not stored, so it needs no new
   column and cannot drift out of sync.

   COUNTED FROM THE LEDGER, NOT FROM ANALYSES
   Usage is counted from `ai_usage`, which members cannot write to — RLS on
   that table has a SELECT policy and no INSERT/UPDATE/DELETE policy, so with
   RLS enabled every write from an authenticated client is denied. Only the
   service-role client used here can record usage. Deleting an analysis
   therefore does not refund the allowance.

   RESERVE, THEN COMMIT OR RELEASE
   Checking a count and then inserting later is a race: two concurrent requests
   both read 2/3 and both proceed, yielding 4. Instead a row is INSERTed first
   as a reservation, then we count how many reservations exist AHEAD of ours.
   If that many already fill the allowance, ours is deleted and refused. Both
   racing requests cannot win, because ordering is decided by the database.
   ========================================================================== */

import { AI_ENABLED, estimateCostUsd } from './config';
import { weeklyAiAllowance, AI_ANALYSIS_PERIOD_DAYS } from '@/lib/plans';
import type { Tier } from '@/lib/types';

if (typeof window !== 'undefined') {
  throw new Error('lib/ai/quota.ts is server-only and was imported from client code.');
}

type AdminClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createAdminClient>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS = AI_ANALYSIS_PERIOD_DAYS * DAY_MS;

/* --------------------------------------------------------------------------
   SCHEMA CAPABILITY PROBE

   WHY THIS EXISTS
   The credit system (migrations 0005-0007) added `ai_usage.entitlement_source`,
   the `analysis_purchases` table and the cost columns. The application code was
   written against that schema BEFORE the migrations were applied to the live
   database. The result was that every reservation INSERT referenced a column
   the database did not have, PostgREST rejected it, and the analyzer stopped
   working entirely — before the AI provider was ever called.

   Rather than have the app hard-depend on a migration having been run, it now
   asks the database once what it actually supports and adapts:

     migrations applied      full behavior — weekly allowance + free/paid credits
     migrations NOT applied  weekly allowance only, exactly as before 0005

   Either way the analyzer works. Credits simply light up when the schema is
   there. Probed once per process and cached; a failed probe is retried next
   cold start.
-------------------------------------------------------------------------- */

interface SchemaCaps {
  /** ai_usage.entitlement_source + analysis_purchases exist (0006/0007). */
  credits: boolean;
  /** ai_usage cost/token columns exist (0005). */
  costColumns: boolean;
}

let cachedCaps: SchemaCaps | null = null;

async function schemaCaps(admin: AdminClient): Promise<SchemaCaps> {
  if (cachedCaps) return cachedCaps;

  const [src, purchases, cost] = await Promise.all([
    admin.from('ai_usage').select('entitlement_source').limit(1),
    admin.from('analysis_purchases').select('id').limit(1),
    admin.from('ai_usage').select('input_tokens').limit(1),
  ]);

  const caps: SchemaCaps = {
    credits: !src.error && !purchases.error,
    costColumns: !cost.error,
  };

  if (!caps.credits || !caps.costColumns) {
    console.warn(
      '[ai] Running with a PARTIAL schema — apply migrations 0005-0007 to enable ' +
        `free/purchased credits and cost tracking. credits=${caps.credits} costColumns=${caps.costColumns}`
    );
  }

  cachedCaps = caps;
  return caps;
}

export interface WeeklyWindow {
  start: Date;
  /** Exclusive. Also the moment the allowance refills. */
  end: Date;
}

/**
 * The player's current rolling allowance window.
 *
 * Anchored to account creation so each member has their own reset weekday.
 * A missing or unparseable anchor falls back to a plain 7-days-ago window,
 * which is safe: it can only ever be stricter, never more generous.
 */
export function currentWindow(accountCreatedAt: string | null | undefined, now = new Date()): WeeklyWindow {
  const anchorMs = accountCreatedAt ? new Date(accountCreatedAt).getTime() : NaN;

  // No usable anchor (missing profile row, unparseable date, or a nonsensical
  // future date that would otherwise hand out a fresh allowance on demand).
  //
  // The window END must sit in the FUTURE, not at `now`. The reservation row
  // is stamped with database time, which is at or after the `now` computed
  // here — so a window ending exactly at `now` would exclude the very row
  // being reserved, making every count zero and the limit unenforceable. That
  // is a bypass: send a forged/blank anchor, get unlimited analyses.
  //
  // Counting back a full period preserves all recent usage, so this fallback
  // can only ever be stricter than the anchored path, never more generous.
  if (!Number.isFinite(anchorMs) || anchorMs > now.getTime()) {
    return {
      start: new Date(now.getTime() - PERIOD_MS),
      end: new Date(now.getTime() + PERIOD_MS),
    };
  }
  const elapsed = now.getTime() - anchorMs;
  const periods = Math.floor(elapsed / PERIOD_MS);
  const start = new Date(anchorMs + periods * PERIOD_MS);
  return { start, end: new Date(start.getTime() + PERIOD_MS) };
}

export interface QuotaState {
  allowed: boolean;
  reason?: string;
  /** INCLUDED analyses used in the current weekly window. */
  used: number;
  /** Included weekly allowance for this tier. */
  limit: number;
  /** Included analyses left this week. */
  remaining: number;
  /**
   * Free signup credits still available (the 3-analysis acquisition offer).
   * Persistent, and consumed BEFORE paid credits so a member never burns
   * something they paid for while a free one remains.
   */
  freeRemaining: number;
  /** Paid $0.50 add-ons still available. Persistent — never reset by the week. */
  purchasedRemaining: number;
  /** included remaining + purchased remaining. What the member can run now. */
  totalRemaining: number;
  /** When the INCLUDED allowance refills. Purchased credit is unaffected. */
  resetsAt: string;
  /** True when a global control refused, rather than the player's own limit. */
  blockedGlobally?: boolean;
}

/**
 * Paid add-ons still available to this member.
 *
 * Derived, never stored: everything ever bought, minus everything ever drawn
 * from the purchased balance. Because the ledger is append-only and usage rows
 * are never deleted by members, this cannot drift or be tampered with.
 *
 * Deliberately independent of the weekly window — purchased credit persists
 * across resets until it is consumed.
 */
export interface CreditBalance {
  /** Free signup credits left. */
  free: number;
  /** Paid $0.50 credits left. */
  purchased: number;
  /** free + purchased. What is available once the weekly allowance is spent. */
  total: number;
}

/**
 * Credits still available, split by how they were obtained.
 *
 * Derived, never stored: everything ever granted, minus everything ever drawn
 * from the credit pool. The ledger is append-only and members cannot write to
 * either table, so this cannot drift or be tampered with.
 *
 * CONSUMPTION ORDER WITHIN THE CREDIT POOL: free first, then paid. Free
 * credits are worth nothing to the member if they expire unused, whereas paid
 * ones cost real money — so consumption is allocated against the free grant
 * before it touches anything purchased.
 *
 * Deliberately independent of the weekly window: credits persist across
 * resets until consumed.
 */
export async function creditBalance(
  admin: AdminClient,
  profileId: string
): Promise<CreditBalance> {
  // No credit schema yet => no credits. Weekly allowance still applies.
  if (!(await schemaCaps(admin)).credits) return { free: 0, purchased: 0, total: 0 };

  const [{ data: grants }, { count: consumed }] = await Promise.all([
    admin.from('analysis_purchases').select('quantity, kind').eq('profile_id', profileId),
    admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('entitlement_source', 'purchased'),
  ]);

  let freeGranted = 0;
  let paidGranted = 0;
  for (const row of grants ?? []) {
    const qty = typeof row.quantity === 'number' ? row.quantity : 0;
    if (row.kind === 'signup_free') freeGranted += qty;
    else paidGranted += qty;
  }

  const used = consumed ?? 0;
  // Free is drawn down first; only the overflow touches paid credit.
  const free = Math.max(0, freeGranted - used);
  const paidUsed = Math.max(0, used - freeGranted);
  const purchased = Math.max(0, paidGranted - paidUsed);

  return { free, purchased, total: free + purchased };
}

/** Total credits available, regardless of origin. */
export async function purchasedRemaining(
  admin: AdminClient,
  profileId: string
): Promise<number> {
  return (await creditBalance(admin, profileId)).total;
}

function formatResetDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Read-only view of the player's allowance. Safe for UI — never reserves.
 *
 * Admins are reported as unlimited so they can exercise the pipeline without
 * consuming a member-sized allowance.
 */
export async function getQuotaState(
  admin: AdminClient,
  args: { profileId: string; tier: Tier; isAdmin: boolean; accountCreatedAt: string | null }
): Promise<QuotaState> {
  const window = currentWindow(args.accountCreatedAt);
  const limit = args.isAdmin ? Number.POSITIVE_INFINITY : weeklyAiAllowance(args.tier);

  // Included usage is scoped to the weekly window AND to the included source,
  // so a purchased analysis never eats into the weekly allowance.
  const caps = await schemaCaps(admin);

  // Pre-0006 every ai_usage row IS an included-allowance row, so the filter is
  // both unnecessary and impossible.
  let usedQuery = admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', args.profileId)
    .gte('created_at', window.start.toISOString())
    .lt('created_at', window.end.toISOString());
  if (caps.credits) usedQuery = usedQuery.eq('entitlement_source', 'included');

  const [{ count }, credits] = await Promise.all([
    usedQuery,
    creditBalance(admin, args.profileId),
  ]);

  const used = count ?? 0;
  const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;
  const totalRemaining = Number.isFinite(remaining) ? remaining + credits.total : remaining;

  return {
    allowed: totalRemaining > 0,
    used,
    limit,
    remaining,
    freeRemaining: credits.free,
    purchasedRemaining: credits.purchased,
    totalRemaining,
    resetsAt: window.end.toISOString(),
  };
}

/**
 * The single global control: the operator kill switch.
 *
 * No spend-based cutoff is enforced here. An automatic cutoff needs a reliable
 * cost figure, and a reliable cost figure needs per-model prices this codebase
 * cannot verify at runtime. Rather than cut members off over an invented
 * number, spend is recorded accurately and the operator flips AI_ENABLED.
 */
async function checkGlobalControls(): Promise<string | null> {
  if (!AI_ENABLED) {
    return 'Automated analysis is temporarily unavailable. Your clip will be sent to a coach for manual review.';
  }
  return null;
}

export interface Reservation {
  /** ai_usage row id holding the player's place. */
  id: string;
  /**
   * Which balance this analysis drew from.
   * 'owner' means it drew from nothing — see the owner path in
   * reserveAnalysis(). The row still exists so provider cost is tracked.
   */
  source: 'included' | 'purchased' | 'owner';
  state: QuotaState;
}

/**
 * Atomically claims one analysis from the weekly allowance.
 *
 * Returns either a reservation (caller MUST later commit or release it) or a
 * refusal with a member-safe reason. Never throws for an ordinary refusal.
 */
export async function reserveAnalysis(
  admin: AdminClient,
  args: {
    profileId: string;
    analysisId: string | null;
    tier: Tier;
    isAdmin: boolean;
    accountCreatedAt: string | null;
  }
): Promise<{ ok: true; reservation: Reservation } | { ok: false; state: QuotaState }> {
  const window = currentWindow(args.accountCreatedAt);
  const limit = args.isAdmin ? Number.POSITIVE_INFINITY : weeklyAiAllowance(args.tier);

  const refuse = (
    reason: string,
    used: number,
    credits: { free: number; purchased: number; total: number } = { free: 0, purchased: 0, total: 0 },
    blockedGlobally = false
  ): { ok: false; state: QuotaState } => {
    const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;
    return {
      ok: false,
      state: {
        allowed: false,
        reason,
        used,
        limit,
        remaining,
        freeRemaining: credits.free,
        purchasedRemaining: credits.purchased,
        totalRemaining: Number.isFinite(remaining) ? remaining + credits.total : remaining,
        resetsAt: window.end.toISOString(),
        blockedGlobally,
      },
    };
  };

  // ---- global controls first: they refuse before anything is written ----
  const globalBlock = await checkGlobalControls();
  if (globalBlock) return refuse(globalBlock, 0, { free: 0, purchased: 0, total: 0 }, true);

  // Credits (free signup + paid add-ons), read before reserving so a refusal
  // can report them honestly.
  const credits = args.isAdmin
    ? { free: 0, purchased: 0, total: 0 }
    : await creditBalance(admin, args.profileId);
  const purchased = credits.total;

  // A free account has no weekly allowance (tier 'none' = 0) but does have the
  // 3 signup credits, so this only refuses when BOTH are exhausted.
  if (!args.isAdmin && limit <= 0 && credits.total <= 0) {
    return refuse(
      'You have used your 3 free AI Shot Analyses. Choose a plan for a weekly allowance, or buy a single analysis.',
      0,
      credits
    );
  }

  // Probed once; needed by both the owner path and the reservation below.
  const caps = await schemaCaps(admin);

  // ---- OWNER / ADMIN: tracked, never charged ---------------------------
  //
  // The owner runs the platform and must never be throttled by a customer
  // limit. Rather than special-casing every downstream check, the usage row is
  // tagged 'owner': it is counted by NEITHER the weekly-allowance query
  // (entitlement_source='included') NOR the credit query (='purchased'), so it
  // consumes no entitlement and decrements no credit — while still recording
  // provider, model, tokens and cost so AI spend monitoring stays accurate.
  //
  // isAdmin comes from the server-side session (profiles.role), never from the
  // request. See the caller in app/api/analysis/run/route.ts.
  if (args.isAdmin) {
    const ownerRow: Record<string, unknown> = {
      profile_id: args.profileId,
      analysis_id: args.analysisId,
      model: null,
      frame_count: 0,
      succeeded: false,
    };
    if (caps.credits) ownerRow.entitlement_source = 'owner';

    const { data: ownerReserved, error: ownerError } = await admin
      .from('ai_usage')
      .insert(ownerRow)
      .select('id')
      .single();

    if (ownerError || !ownerReserved) {
      console.error('[ai] owner usage row failed:', ownerError?.message);
      return refuse('We could not start the analysis just now. Please try again in a moment.', 0);
    }

    return {
      ok: true,
      reservation: {
        id: ownerReserved.id as string,
        source: 'owner',
        state: {
          allowed: true,
          used: 0,
          limit: Number.POSITIVE_INFINITY,
          remaining: Number.POSITIVE_INFINITY,
          freeRemaining: 0,
          purchasedRemaining: 0,
          totalRemaining: Number.POSITIVE_INFINITY,
          resetsAt: window.end.toISOString(),
        },
      },
    };
  }

  // ---- reserve ---------------------------------------------------------
  // Reserved as 'included' first; corrected to 'purchased' below if the weekly
  // allowance turns out to be spent. Doing it in this order keeps the
  // count-ahead race check operating on a single, consistent set of rows.
  const reservationRow: Record<string, unknown> = {
    profile_id: args.profileId,
    analysis_id: args.analysisId,
    model: null,
    frame_count: 0,
    // Flipped to true only once the provider has actually been called.
    succeeded: false,
  };
  // THE LINE THAT BROKE THE ANALYZER: setting this unconditionally made every
  // INSERT fail against a database without migration 0006.
  if (caps.credits) reservationRow.entitlement_source = 'included';

  const { data: reserved, error: reserveError } = await admin
    .from('ai_usage')
    .insert(reservationRow)
    .select('id, created_at')
    .single();

  if (reserveError || !reserved) {
    console.error('[ai] could not reserve allowance:', reserveError?.message);
    return refuse('We could not start the analysis just now. Please try again in a moment.', 0);
  }

  const release = async () => {
    await admin.from('ai_usage').delete().eq('id', reserved.id);
  };

  // ---- how many claims sit AHEAD of ours in this window? ----------------
  // Ordering is decided by the database, so two concurrent requests cannot
  // both believe they took the last slot.
  let aheadQuery = admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', args.profileId)
    .gte('created_at', window.start.toISOString())
    .lt('created_at', window.end.toISOString())
    .lt('created_at', reserved.created_at as string);
  if (caps.credits) aheadQuery = aheadQuery.eq('entitlement_source', 'included');

  const { count: ahead } = await aheadQuery;

  const used = ahead ?? 0;
  let source: 'included' | 'purchased' = 'included';

  // ---- included first, then purchased ---------------------------------
  // Purchased credit is only ever touched once the weekly allowance is spent,
  // so a member never burns something they paid for while free analyses
  // remain.
  if (!args.isAdmin && used >= limit && !caps.credits) {
    // No credit schema: the weekly allowance is the whole entitlement.
    await release();
    return refuse(
      `You've used your weekly AI Shot Analysis allowance. It resets on ${formatResetDate(window.end)}.`,
      used
    );
  }

  if (!args.isAdmin && used >= limit) {
    // How many purchased claims already sit ahead of ours? Same ordering
    // guarantee as above, so concurrent requests cannot both take the last
    // paid analysis.
    const { count: purchasedAhead } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', args.profileId)
      .eq('entitlement_source', 'purchased')
      .lt('created_at', reserved.created_at as string);

    const { data: purchaseRows } = await admin
      .from('analysis_purchases')
      .select('quantity')
      .eq('profile_id', args.profileId);

    const bought = (purchaseRows ?? []).reduce(
      (sum, row) => sum + (typeof row.quantity === 'number' ? row.quantity : 0),
      0
    );

    if ((purchasedAhead ?? 0) >= bought) {
      await release();
      return refuse(
        limit > 0
          ? `You've used your weekly AI Shot Analysis allowance. It resets on ${formatResetDate(window.end)}.`
          : 'You have used your 3 free AI Shot Analyses.',
        used,
        { free: 0, purchased: 0, total: 0 }
      );
    }

    // Draw from the paid balance instead.
    source = 'purchased';
    const { error: markError } = await admin
      .from('ai_usage')
      .update({ entitlement_source: 'purchased' })
      .eq('id', reserved.id);

    if (markError) {
      // Could not attribute it to the paid balance, so it would silently be
      // taken from a weekly allowance that is already spent. Refuse instead.
      console.error('[ai] could not mark reservation as purchased:', markError.message);
      await release();
      return refuse(
        'We could not start that analysis just now. Please try again in a moment.',
        used,
        credits
      );
    }
  }

  const includedUsed = source === 'included' ? used + 1 : used;
  const includedRemaining = Number.isFinite(limit)
    ? Math.max(0, limit - includedUsed)
    : Number.POSITIVE_INFINITY;
  // A credit draw comes off FREE first, matching creditBalance()'s allocation.
  const freeLeft =
    source === 'purchased' ? Math.max(0, credits.free - 1) : credits.free;
  const purchasedLeft =
    source === 'purchased' && credits.free === 0
      ? Math.max(0, credits.purchased - 1)
      : credits.purchased;
  const creditsLeft = freeLeft + purchasedLeft;

  return {
    ok: true,
    reservation: {
      id: reserved.id as string,
      source,
      state: {
        allowed: true,
        used: includedUsed,
        limit,
        remaining: includedRemaining,
        freeRemaining: freeLeft,
        purchasedRemaining: purchasedLeft,
        totalRemaining: Number.isFinite(includedRemaining)
          ? includedRemaining + creditsLeft
          : includedRemaining,
        resetsAt: window.end.toISOString(),
      },
    },
  };
}

/**
 * Confirms a reservation once the provider has actually been called.
 *
 * Called for FAILED provider calls too — a failed model call still costs
 * tokens, so it still consumes the allowance. What must not consume it is a
 * failure that occurred BEFORE any provider call (see releaseReservation).
 *
 * An automatic repair retry happens inside a single reserved analysis and
 * commits once, so it never consumes a second entitlement no matter how many
 * provider attempts it made.
 */
export async function commitReservation(
  admin: AdminClient,
  reservationId: string,
  args: {
    model: string | null;
    frameCount: number;
    succeeded: boolean;
    /**
     * Provider-reported usage for EVERY call made inside this one entitlement.
     * One entry normally; two when an automatic format-repair retry ran.
     */
    usage?: {
      provider: 'anthropic' | 'openai';
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      kind: 'primary' | 'repair';
    }[];
  }
): Promise<void> {
  const attempts = args.usage ?? [];

  // Sum only what the provider actually reported. If it reported nothing,
  // these stay null — "not known", never a misleading zero.
  const sum = (pick: 'inputTokens' | 'outputTokens'): number | null => {
    const known = attempts.map((a) => a[pick]).filter((v): v is number => v !== null);
    return known.length ? known.reduce((a, b) => a + b, 0) : null;
  };

  const inputTokens = sum('inputTokens');
  const outputTokens = sum('outputTokens');

  const caps = await schemaCaps(admin);

  const patch: Record<string, unknown> = {
    model: args.model,
    frame_count: args.frameCount,
    succeeded: args.succeeded,
  };

  if (caps.costColumns) {
    Object.assign(patch, {
      provider: attempts[0]?.provider ?? null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      // null unless the operator configured token rates. Never invented.
      estimated_cost_usd: estimateCostUsd(inputTokens, outputTokens),
      // Provider calls, NOT customer entitlements. Two calls here still cost
      // the member exactly one analysis.
      provider_attempts: Math.max(1, attempts.length),
      attempt_breakdown: attempts.length ? attempts : null,
    });
  }

  const { error } = await admin.from('ai_usage').update(patch).eq('id', reservationId);

  if (error) console.error('[ai_usage] could not commit reservation:', error.message);
}

/**
 * Returns the reservation to the player's allowance.
 *
 * ONLY for failures that happened before the provider was contacted — no
 * provider call means no cost, so it must not cost the player an analysis.
 */
export async function releaseReservation(
  admin: AdminClient,
  reservationId: string,
  why: string
): Promise<void> {
  const { error } = await admin.from('ai_usage').delete().eq('id', reservationId);
  if (error) {
    console.error('[ai_usage] could not release reservation:', error.message);
    return;
  }
  console.warn(`[ai] allowance returned (no provider call was made): ${why}`);
}
