import { requireStaff } from '@/lib/session';
import { PageHeading } from '@/components/ui';
import NutritionManager from './NutritionManager';

export const metadata = { title: 'Nutrition CMS — Admin' };

/* ==========================================================================
   NUTRITION CMS — ENTRY POINT

   requireStaff() gates the page, matching /admin/content. This is convenience,
   not security: every mutation the client component makes hits an endpoint
   that calls requireStaff() again, and beneath that the 0012 RLS policies
   require auth_is_staff(). Hiding this page from a member would prove nothing.
   ========================================================================== */

export default async function AdminNutritionPage() {
  const session = await requireStaff();

  return (
    <div>
      <PageHeading
        eyebrow="Admin"
        title="Nutrition cookbook"
        sub="Create, edit, preview and publish recipes and Secret Sauce entries. Nothing here needs SQL."
      />
      <NutritionManager isAdmin={session.role === 'admin'} />
    </div>
  );
}
