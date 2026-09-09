import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/ui';
import CoachingContentManager from './CoachingContentManager';

export const metadata = { title: 'Coaching Content — Admin' };
export const dynamic = 'force-dynamic';

/* ==========================================================================
   ADMIN > COACHING CONTENT

   Staff-only (requireStaff — any coach or admin, same access level as
   Coach > Assign). Lets a coach pick a member, then add/update/remove
   member_coaching_content rows (workout or nutrition) for that member —
   the data backing the Custom Workout Programming and Custom Nutrition
   Coaching member-facing pages. Reuses the same `players` table lookup
   already used by Coach > Assign (lib/assignments.ts's
   getAssignablePlayers()) rather than inventing a second member picker.
   ========================================================================== */

export default async function AdminCoachingContentPage() {
  await requireStaff();

  let players: { profileId: string; name: string }[] = [];
  let content: {
    id: string;
    profileId: string;
    contentType: 'workout' | 'nutrition';
    title: string;
    notes: string | null;
    fileName: string | null;
    createdAt: string;
  }[] = [];

  if (!DEMO_MODE) {
    const supabase = await createServerClient();
    const [{ data: playerRows }, { data: contentRows }] = await Promise.all([
      supabase.from('players').select('profile_id, first_name, last_name').order('first_name'),
      supabase
        .from('member_coaching_content')
        .select('id, profile_id, content_type, title, notes, file_name, created_at')
        .order('created_at', { ascending: false }),
    ]);

    players = (
      (playerRows ?? []) as { profile_id: string; first_name: string; last_name: string | null }[]
    ).map((p) => ({
      profileId: p.profile_id,
      name: p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name,
    }));

    content = (
      (contentRows ?? []) as {
        id: string;
        profile_id: string;
        content_type: 'workout' | 'nutrition';
        title: string;
        notes: string | null;
        file_name: string | null;
        created_at: string;
      }[]
    ).map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      contentType: r.content_type,
      title: r.title,
      notes: r.notes,
      fileName: r.file_name,
      createdAt: r.created_at,
    }));
  }

  return (
    <div>
      <PageHeading
        eyebrow="Admin"
        title="Coaching Content"
        sub="Assign workout programming and nutrition materials to a specific member. Only that member (and staff) can see what's assigned here."
      />
      <CoachingContentManager players={players} initialContent={content} demo={DEMO_MODE} />
    </div>
  );
}
