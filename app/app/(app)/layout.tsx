import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { requireSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        tier={session.tier}
        role={session.role}
        demo={session.demo}
        subscriptionActive={session.subscriptionActive}
        playerName={session.fullName || session.email}
      />
      {/* pb-20 keeps content clear of the fixed MobileNav bar on phones; lg:pb-10
          restores the normal bottom spacing once MobileNav is hidden. */}
      <main className="min-w-0 flex-1 px-5 py-8 pb-20 lg:px-10 lg:py-10 lg:pb-10">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
