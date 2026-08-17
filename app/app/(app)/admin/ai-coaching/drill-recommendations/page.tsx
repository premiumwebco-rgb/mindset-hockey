import { requireAdmin } from '@/lib/session';
import { Eyebrow } from '@/components/ui';
import DrillRecommendationsManager from './DrillRecommendationsManager';

export const metadata = { title: 'Drill Recommendations — Admin — Mindset Hockey' };

export default async function DrillRecommendationsPage() {
  // Page-level gate. The real boundary is 0014's RLS (auth_is_admin() on
  // every write) — this just keeps a non-admin from ever rendering the screen.
  await requireAdmin();

  return (
    <div>
      <Eyebrow>Admin · AI Coaching</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Drill Recommendations</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-silver-dim">
        When AI Shot Analysis identifies a player&apos;s weakest category, the dashboard&apos;s AI
        Insight card looks up the highest-priority active mapping below and recommends that drill.
        Add, reorder, disable or remove mappings — no deploy required.
      </p>

      <div className="mt-8">
        <DrillRecommendationsManager />
      </div>
    </div>
  );
}
