import { requireTier } from '@/lib/session';
import { PageHeading, EmptyState } from '@/components/ui';

export const metadata = { title: 'Shot Mechanics Course' };

/* ==========================================================================
   PRODUCTION CLEANUP — this page previously rendered `lib/demo-data.ts`'s
   fake LESSONS/DRILLS fixtures unconditionally to every Standard+ member as
   a 7-module course with fake video durations. No real course content
   exists behind it. Rather than show fabricated content as if it were real,
   this is now an honest coming-soon state. Not linked from any navigation
   today. The real 7-point rubric itself (lib/types.ts RUBRIC) is genuine
   and already used for actual video-review scoring — this page is only
   about the standalone course wrapper around it.
   ========================================================================== */

export default async function ShotCourse() {
  await requireTier('basic');

  return (
    <>
      <PageHeading eyebrow="The flagship" title="Coming soon" />
      <EmptyState
        title="The Shot Mechanics Course isn't built yet"
        body="A self-paced course walking through all seven mechanics is planned, but no video content is live yet. Submit film for a coach's rubric-scored review in the meantime."
      />
    </>
  );
}
