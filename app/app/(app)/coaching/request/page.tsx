import { redirect } from 'next/navigation';

// Consolidated into /custom (the single, obviously-named central location for
// building a Custom Plan — see app/(app)/custom/page.tsx). This route is kept
// only so old bookmarks/links (and Stripe's historical success/cancel URLs)
// keep working; it does nothing but forward the query string.
export default async function RequestCustomPlanRedirect({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sp = await searchParams;
  const qs = sp.checkout ? `?checkout=${encodeURIComponent(sp.checkout)}` : '';
  redirect(`/custom${qs}`);
}
