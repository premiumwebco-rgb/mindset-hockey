import { requireAdmin } from '@/lib/session';
import { Eyebrow } from '@/components/ui';
import MindsetManager from './MindsetManager';

export const metadata = { title: 'Mindset Training — Admin — Mindset Hockey' };

export default async function MindsetAdminPage() {
  await requireAdmin();

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Mindset Training</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-silver-dim">
        Upload and manage the video mindset library — confidence, visualization, resilience,
        leadership, focus, pressure performance, goal setting and mental recovery.
      </p>

      <div className="mt-8">
        <MindsetManager />
      </div>
    </div>
  );
}
