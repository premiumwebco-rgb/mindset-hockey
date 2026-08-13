import Sidebar from '@/components/Sidebar';
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
      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </main>
    </div>
  );
}
