'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/app/(app)/admin/users/page';

const TIERS = ['none', 'basic', 'premium'];
const ROLES = ['member', 'coach', 'admin'];

export default function UserRow({ user, demo }: { user: AdminUser; demo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    if (demo) {
      setError('Demo mode — connect Supabase to make changes.');
      return;
    }
    const res = await fetch('/api/admin/user', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: user.id, ...body }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Update failed.');
      return;
    }
    start(() => router.refresh());
  }

  return (
    <tr className="border-b border-white/[.05] last:border-0">
      <td className="px-4 py-3">
        <p className="font-semibold text-white">{user.full_name || '—'}</p>
        <p className="text-[12.5px] text-silver-dim">{user.email}</p>
        {error && <p className="mt-1 text-[12px] text-[#ff6b85]">{error}</p>}
      </td>

      <td className="px-4 py-3">
        <select
          defaultValue={user.tier}
          onChange={(e) => patch({ tier: e.target.value })}
          disabled={pending}
          className="rounded-md border border-white/[.14] bg-ink px-2 py-1.5 text-[13px] text-white"
          aria-label={`Tier for ${user.email}`}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <button
          onClick={() => patch({ subscription_active: !user.subscription_active })}
          disabled={pending}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
            user.subscription_active
              ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
              : 'border-amber/40 bg-amber/10 text-amber'
          }`}
        >
          {user.subscription_active ? 'Active' : 'Inactive'}
        </button>
      </td>

      <td className="px-4 py-3">
        <select
          defaultValue={user.role}
          onChange={(e) => patch({ role: e.target.value })}
          disabled={pending}
          className="rounded-md border border-white/[.14] bg-ink px-2 py-1.5 text-[13px] capitalize text-white"
          aria-label={`Role for ${user.email}`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3 text-right">
        <button
          onClick={() => patch({ suspended: !user.suspended })}
          disabled={pending}
          className="text-[12.5px] text-silver-dim hover:text-white"
        >
          {user.suspended ? 'Unsuspend' : 'Suspend'}
        </button>
      </td>
    </tr>
  );
}
