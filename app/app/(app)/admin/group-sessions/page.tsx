import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/ui';
import { mapSessionRow, mapRegistrationRow } from '@/lib/groupCoaching';
import GroupSessionsManager from './GroupSessionsManager';

export const metadata = { title: 'Group Sessions — Admin' };
export const dynamic = 'force-dynamic';

/* ==========================================================================
   ADMIN > GROUP SESSIONS

   Staff-only (requireStaff). Create/edit/cancel group coaching sessions and
   see who's registered for each — the admin side of the Group Coaching
   product described on /coaching/one-on-one and sold on /coaching/signup.
   Cancelling here (via GroupSessionsManager -> POST
   /api/admin/group-sessions/[id]/cancel) issues real Stripe refunds; see
   that route's header comment for the full idempotency guarantee.
   ========================================================================== */

export default async function AdminGroupSessionsPage() {
  await requireStaff();

  let sessions: ReturnType<typeof mapSessionRow>[] = [];
  let registrationsBySession: Record<string, (ReturnType<typeof mapRegistrationRow> & { memberName: string })[]> = {};

  if (!DEMO_MODE) {
    const supabase = await createServerClient();
    const [{ data: sessionRows }, { data: regRows }, { data: playerRows }] = await Promise.all([
      supabase.from('group_coaching_sessions').select('*').order('start_at', { ascending: false }),
      supabase.from('group_session_registrations').select('*').order('created_at', { ascending: false }),
      supabase.from('players').select('profile_id, first_name, last_name'),
    ]);

    const nameByProfile = Object.fromEntries(
      ((playerRows ?? []) as { profile_id: string; first_name: string; last_name: string | null }[]).map((p) => [
        p.profile_id,
        p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name,
      ])
    );

    sessions = (sessionRows ?? []).map(mapSessionRow);
    for (const row of (regRows ?? []) as Record<string, unknown>[]) {
      const reg = mapRegistrationRow(row);
      const withName = { ...reg, memberName: nameByProfile[reg.profileId] ?? 'Unknown member' };
      (registrationsBySession[reg.sessionId] ??= []).push(withName);
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="Admin"
        title="Group Sessions"
        sub="Create and manage Group Coaching sessions. Cancelling a session automatically refunds everyone registered."
      />
      <GroupSessionsManager
        initialSessions={sessions}
        registrationsBySession={registrationsBySession}
        demo={DEMO_MODE}
      />
    </div>
  );
}
