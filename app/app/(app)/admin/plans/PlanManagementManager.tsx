'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MEMBERSHIP_PERMISSIONS,
  COACHING_PERMISSIONS,
  PERMISSION_LABEL,
  type PermissionKey,
} from '@/lib/permissions';
import { Card, EmptyState } from '@/components/ui';

export interface AdminPlanUser {
  id: string;
  email: string;
  fullName: string | null;
  tier: string;
  subscriptionActive: boolean;
  permissions: Record<PermissionKey, boolean>;
}

export interface AdminPlanRequest {
  id: string;
  profileId: string;
  email: string;
  fullName: string | null;
  requestedServices: string[];
  notes: string | null;
  status: 'new' | 'contacted' | 'active' | 'declined';
  createdAt: string;
}

const STATUS_STYLE: Record<AdminPlanRequest['status'], string> = {
  new: 'border-amber/40 bg-amber/10 text-amber',
  contacted: 'border-electric/40 bg-electric/10 text-electric-glow',
  active: 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]',
  declined: 'border-white/15 text-silver-dim',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PlanManagementManager({
  users,
  requests,
  demo,
}: {
  users: AdminPlanUser[];
  requests: AdminPlanRequest[];
  demo: boolean;
}) {
  const [query, setQuery] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="mt-8 grid gap-10">
      {/* ------------------------------------------- custom plan requests --- */}
      <section>
        <h2 className="display text-[20px]">Custom Plan Requests</h2>
        {requests.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No requests yet" body="Submissions from Request Custom Plan will show up here." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} demo={demo} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------- member access --- */}
      <section>
        <h2 className="display text-[20px]">Member Access</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="mt-4 w-full max-w-sm rounded-lg border border-white/[.12] bg-white/[.03] px-4 py-2.5 text-[14.5px] text-white placeholder:text-silver-dim focus:border-electric focus:outline-none"
        />
        <div className="mt-4 grid gap-3">
          {filteredUsers.map((u) => (
            <UserPermissionCard key={u.id} user={u} demo={demo} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RequestCard({ request, demo }: { request: AdminPlanRequest; demo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: AdminPlanRequest['status']) {
    setError(null);
    if (demo) {
      setError('Demo mode — connect Supabase to make changes.');
      return;
    }
    const res = await fetch('/api/admin/plan-requests', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: request.id, status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Update failed.');
      return;
    }
    start(() => router.refresh());
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">{request.fullName || request.email}</p>
          <p className="text-[12.5px] text-silver-dim">
            {request.email} · {formatDate(request.createdAt)}
          </p>
        </div>
        <select
          defaultValue={request.status}
          onChange={(e) => setStatus(e.target.value as AdminPlanRequest['status'])}
          disabled={pending}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${STATUS_STYLE[request.status]}`}
        >
          {(['new', 'contacted', 'active', 'declined'] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-2 text-[12px] text-[#ff6b85]">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {request.requestedServices.map((s) => (
          <span
            key={s}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-silver-dim"
          >
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {request.notes && <p className="mt-3 text-[13.5px] text-silver">{request.notes}</p>}
    </Card>
  );
}

function UserPermissionCard({ user, demo }: { user: AdminPlanUser; demo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function togglePermission(key: PermissionKey, value: boolean) {
    setError(null);
    if (demo) {
      setError('Demo mode — connect Supabase to make changes.');
      return;
    }
    const res = await fetch('/api/admin/permissions', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: user.id, permissions: { [key]: value } }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Update failed.');
      return;
    }
    start(() => router.refresh());
  }

  const grantedCount = Object.values(user.permissions).filter(Boolean).length;

  return (
    <Card className="p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{user.fullName || user.email}</p>
          <p className="truncate text-[12.5px] text-silver-dim">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">
            {grantedCount} of {MEMBERSHIP_PERMISSIONS.length + COACHING_PERMISSIONS.length} on
          </span>
          <span className="text-[12px] text-silver-dim">{open ? 'Hide' : 'Edit'}</span>
        </div>
      </button>

      {error && <p className="mt-2 text-[12px] text-[#ff6b85]">{error}</p>}

      {open && (
        <div className="mt-4 grid gap-4 border-t border-white/[.08] pt-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
              Membership (Stripe-managed)
            </p>
            <div className="grid gap-1.5">
              {MEMBERSHIP_PERMISSIONS.map((key) => (
                <PermissionToggle
                  key={key}
                  label={PERMISSION_LABEL[key]}
                  checked={user.permissions[key]}
                  disabled={pending}
                  onChange={(v) => togglePermission(key, v)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
              Custom Coaching
            </p>
            <div className="grid gap-1.5">
              {COACHING_PERMISSIONS.map((key) => (
                <PermissionToggle
                  key={key}
                  label={PERMISSION_LABEL[key]}
                  checked={user.permissions[key]}
                  disabled={pending}
                  onChange={(v) => togglePermission(key, v)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function PermissionToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-[36px] items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[.03]">
      <span className="text-[13.5px] text-silver">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] accent-electric"
      />
    </label>
  );
}
