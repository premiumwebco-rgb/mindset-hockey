import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, Eyebrow, EmptyState } from '@/components/ui';

export const metadata = { title: 'Leads — Admin' };

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  player_age: number | null;
  level: string | null;
  plan_interest: string | null;
  goals: string | null;
  handled: boolean;
  created_at: string;
}

export default async function AdminLeadsPage() {
  await requireAdmin();

  let leads: LeadRow[] = [];
  if (DEMO_MODE) {
    leads = [
      { id: '1', name: 'Karen Whitfield', email: 'karen@example.com', phone: '240-555-0110', player_age: 14, level: 'A', plan_interest: 'premium', goals: 'He works hard but his shot has not improved in a year.', handled: false, created_at: new Date().toISOString() },
    ];
  } else {
    const admin = await createAdminClient();
    const { data } = await admin.from('leads').select('*').order('created_at', { ascending: false }).limit(200);
    leads = (data as LeadRow[]) ?? [];
  }

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Leads</h1>
      <p className="mt-3 text-[15px] text-silver-dim">
        Custom-quote requests and assessment enquiries from the public site.
      </p>

      {leads.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No leads yet" body="Enquiries from the contact form land here." />
        </div>
      ) : (
        <div className="mt-7 grid gap-3">
          {leads.map((l) => (
            <Card key={l.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{l.name}</p>
                  <p className="text-[13px] text-silver-dim">
                    <a href={`mailto:${l.email}`} className="hover:text-white">{l.email}</a>
                    {l.phone && (
                      <>
                        {' · '}
                        <a href={`tel:${l.phone}`} className="hover:text-white">{l.phone}</a>
                      </>
                    )}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${l.handled ? 'border-white/20 text-silver-dim' : 'border-amber/40 bg-amber/10 text-amber'}`}>
                  {l.handled ? 'Handled' : 'New'}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-silver-dim">
                {[l.player_age && `Age ${l.player_age}`, l.level, l.plan_interest].filter(Boolean).join(' · ')}
              </p>
              {l.goals && <p className="mt-2 text-[14.5px] text-silver">{l.goals}</p>}
              <p className="mt-2 text-[12px] text-silver-dim">
                {new Date(l.created_at).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
