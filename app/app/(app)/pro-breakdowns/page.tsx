import { requireTier } from '@/lib/session';
import { PageHeading, EmptyState } from '@/components/ui';

export const metadata = { title: 'Pro Breakdowns' };

/* ==========================================================================
   PRODUCTION CLEANUP — this page previously rendered `lib/demo-data.ts`'s
   fake PRO_BREAKDOWNS fixture (fake players, fake clips, fake slugs) to
   every Premium member. No real elite-release library or admin authoring
   tool exists behind it — `pro_breakdowns`/`comparisons` (migration 0001)
   have zero real rows. Rather than show fabricated footage as if it were
   real, this is now an honest coming-soon state. Not linked from any
   navigation today.
   ========================================================================== */

export default async function ProBreakdowns() {
  await requireTier('premium');

  return (
    <>
      <PageHeading eyebrow="Premium membership" title="Coming soon" />
      <EmptyState
        title="The Elite Release Library isn't built yet"
        body="Side-by-side breakdowns against Jr hockey and AAA releases are planned, but no clips are live yet. Your own shot mechanics are still scored and reviewed through video review and AI shot analysis."
      />
    </>
  );
}
