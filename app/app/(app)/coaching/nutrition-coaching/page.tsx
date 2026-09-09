import { requirePermission, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Custom Nutrition Coaching — Mindset Hockey' };
export const dynamic = 'force-dynamic';

/* ==========================================================================
   CUSTOM NUTRITION COACHING — one of the 4 Personalized Plan tabs. Shows
   ONLY this member's own member_coaching_content rows (content_type =
   'nutrition') — enforced twice over, same defence-in-depth pattern as the
   rest of the app: the query below filters by profile_id = session.userId,
   and Postgres RLS (member_coaching_content_read, migration 0024) would
   refuse a row belonging to anyone else even if this filter were removed.
   Content is uploaded/managed only from Admin > Coaching Content — this
   page never writes anything.
   ========================================================================== */

interface Row {
  id: string;
  title: string;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

export default async function NutritionCoachingPage() {
  const session = await requirePermission('custom_programming');

  let rows: Row[] = [];
  const signedUrls = new Map<string, string>();

  if (!DEMO_MODE) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('member_coaching_content')
      .select('id, title, notes, file_path, file_name, created_at')
      .eq('profile_id', session.userId)
      .eq('content_type', 'nutrition')
      .order('created_at', { ascending: false });
    rows = (data ?? []) as Row[];

    for (const row of rows) {
      if (!row.file_path) continue;
      const { data: signed } = await supabase.storage
        .from('member-coaching-content')
        .createSignedUrl(row.file_path, 60 * 30);
      if (signed?.signedUrl) signedUrls.set(row.id, signed.signedUrl);
    }
  }

  return (
    <div>
      <Eyebrow>Personalized Plan</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Custom Nutrition Coaching</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Personalized nutrition guidance and adjustments based on your performance and goals. This is
        yours — only you and your coaches can see it.
      </p>

      <div className="mt-8">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body="Your coach hasn't added your nutrition materials yet — check back soon, or reach out if you're expecting something."
          />
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-silver-dim">
                      Assigned to you
                    </p>
                    <p className="mt-1 text-[16px] font-semibold text-white">{r.title}</p>
                  </div>
                  <p className="shrink-0 text-[12px] text-silver-dim">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {r.notes && <p className="mt-3 text-[14px] leading-relaxed text-silver">{r.notes}</p>}
                {r.file_path && signedUrls.get(r.id) && (
                  <a
                    href={signedUrls.get(r.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-[13px] font-semibold text-electric-glow hover:text-electric"
                  >
                    Download {r.file_name ?? 'file'} →
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
