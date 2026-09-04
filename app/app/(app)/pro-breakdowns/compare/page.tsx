import Link from 'next/link';
import { requireTier } from '@/lib/session';
import { PageHeading, EmptyState } from '@/components/ui';

export const metadata = { title: 'Comparison Tool' };

/* ==========================================================================
   PRODUCTION CLEANUP — this was the highest-priority fake-data bug found in
   the audit: `const myClips = SUBMISSIONS.filter((s) => s.playerName ===
   'Tyler M.')` hardcoded a fake player's fake submissions as if they were
   the logged-in member's own real video review history, paired against
   `lib/demo-data.ts`'s fake PRO_BREAKDOWNS clips. Every member who reached
   this page saw the identical "Tyler M." footage presented as their own.

   There is no real elite-release clip library to compare against (see
   /pro-breakdowns), so this is now an honest coming-soon state rather than
   a real-vs-fake wiring — showing a member's real video_submissions next to
   a fake "pro" clip would still be dishonest personalization. Not linked
   from any navigation today.
   ========================================================================== */

export default async function Compare() {
  await requireTier('premium');

  return (
    <>
      <Link
        href="/pro-breakdowns"
        className="mb-6 inline-block text-[13.5px] text-silver-dim hover:text-white"
      >
        ← Pro breakdowns
      </Link>
      <PageHeading eyebrow="Side-by-side" title="Coming soon" />
      <EmptyState
        title="The comparison tool isn't built yet"
        body="Side-by-side, frame-synced comparison against real elite footage is planned, but no clips are live yet. You can review your own submissions any time under Video Review."
        action={
          <Link href="/reviews" className="text-[13.5px] font-semibold text-electric-glow hover:underline">
            Go to Video Review →
          </Link>
        }
      />
    </>
  );
}
