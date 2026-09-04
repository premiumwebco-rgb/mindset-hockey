import { requireSession } from '@/lib/session';
import { PageHeading, EmptyState } from '@/components/ui';

export const metadata = { title: 'Drill Database' };

/* ==========================================================================
   PRODUCTION CLEANUP — this page previously rendered `lib/demo-data.ts`'s
   fake DRILLS fixture unconditionally to every member, tagged with fake
   pillar/rubric-point/difficulty data. There is no real drill catalogue or
   admin authoring tool behind it, and `training_resources` (the real content
   system) does not yet model drill-specific fields (sets/reps, difficulty,
   equipment). Rather than show fabricated content as if it were real, this
   is now an honest coming-soon state. Not linked from any navigation today.
   ========================================================================== */

export default async function Drills() {
  await requireSession();

  return (
    <>
      <PageHeading eyebrow="Drill database" title="Coming soon" />
      <EmptyState
        title="The drill database isn't built yet"
        body="A searchable, rubric-tagged drill library is planned, but nothing here is live yet. In the meantime, drills your coach recommends show up in your video review feedback and coach assignments."
      />
    </>
  );
}
