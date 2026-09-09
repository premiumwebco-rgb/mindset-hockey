/* ==========================================================================
   LIVE VIRTUAL COACHING — pricing constants

   THE ONE PLACE these dollar amounts live, mirroring lib/customPlan.ts's
   own header comment. Both the 1-on-1 request flow and the group session
   checkout route read from here rather than hardcoding "$30"/"$10" in
   multiple places.

   1-on-1 Video Coaching has NO Stripe checkout — the member submits an
   availability request and a coach follows up to schedule and collect
   payment directly, per product decision (no fake calendar/availability
   system). ONE_ON_ONE_SESSION_PRICE_CENTS is display-only.

   Group Coaching Sessions DO have a real Stripe checkout (one-time payment,
   mode: 'payment', same shape as the AI Shot Analysis add-on — see
   app/api/analysis/purchase/route.ts). Each session's actual charged price
   is GROUP_SESSION_DEFAULT_PRICE_CENTS unless an admin sets a different
   price_cents when creating it (see group_coaching_sessions.price_cents,
   migration 0024) — the checkout route always charges the session's own
   stored price_cents, never a client-supplied amount.
   ========================================================================== */

/** Display-only — no checkout exists for this option, see header comment. */
export const ONE_ON_ONE_SESSION_PRICE_CENTS = 3000;

/** Default price for a newly-created group session; an admin can override it per-session. */
export const GROUP_SESSION_DEFAULT_PRICE_CENTS = 1000;

export type GroupSessionStatus = 'scheduled' | 'cancelled';
export type GroupRegistrationStatus = 'paid' | 'refunded';

export interface GroupCoachingSession {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  priceCents: number;
  capacity: number | null;
  status: GroupSessionStatus;
  createdBy: string;
  cancelledAt: string | null;
  createdAt: string;
}

export interface GroupSessionRegistration {
  id: string;
  sessionId: string;
  profileId: string;
  status: GroupRegistrationStatus;
  amountCents: number;
  createdAt: string;
  refundedAt: string | null;
}

export function mapSessionRow(row: Record<string, unknown>): GroupCoachingSession {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    startAt: row.start_at as string,
    priceCents: Number(row.price_cents ?? 0),
    capacity: row.capacity === null || row.capacity === undefined ? null : Number(row.capacity),
    status: row.status as GroupSessionStatus,
    createdBy: row.created_by as string,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapRegistrationRow(row: Record<string, unknown>): GroupSessionRegistration {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    profileId: row.profile_id as string,
    status: row.status as GroupRegistrationStatus,
    amountCents: Number(row.amount_cents ?? 0),
    createdAt: row.created_at as string,
    refundedAt: (row.refunded_at as string | null) ?? null,
  };
}
