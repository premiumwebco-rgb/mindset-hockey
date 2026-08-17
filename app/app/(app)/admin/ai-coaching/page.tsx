import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';

export const metadata = { title: 'AI Coaching — Admin — Mindset Hockey' };

/**
 * Landing page for the AI Coaching admin section. Currently one screen
 * (Drill Recommendations); structured as a section with sub-pages, not a
 * single flat page, so a later kind (Workout Recommendations, Nutrition
 * Recommendations, Video Recommendations — see ai_drill_recommendations'
 * `recommendation_kind` column in migration 0014) has somewhere to go
 * without restructuring the admin nav.
 */
export default async function AiCoachingAdminPage() {
  await requireAdmin();

  const links = [
    {
      href: '/admin/ai-coaching/drill-recommendations',
      title: 'Drill Recommendations',
      body: 'Map each AI rubric category to the drill(s) recommended for it, in priority order.',
    },
  ];

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">AI Coaching</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-silver-dim">
        Controls what the AI Shot Analysis recommendation system suggests when it identifies a
        weak category — entirely data-driven, no code changes required to update a mapping.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card hover className="h-full p-6">
              <h3 className="display text-[19px]">{l.title}</h3>
              <p className="mt-2 text-[14.5px] text-silver-dim">{l.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
