'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, EmptyState } from '@/components/ui';

interface Player {
  profileId: string;
  name: string;
}

interface ContentRow {
  id: string;
  profileId: string;
  contentType: 'workout' | 'nutrition';
  title: string;
  notes: string | null;
  fileName: string | null;
  createdAt: string;
}

export default function CoachingContentManager({
  players,
  initialContent,
  demo,
}: {
  players: Player[];
  initialContent: ContentRow[];
  demo: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [profileId, setProfileId] = useState('');
  const [contentType, setContentType] = useState<'workout' | 'nutrition'>('workout');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const playerName = useMemo(
    () => Object.fromEntries(players.map((p) => [p.profileId, p.name])),
    [players]
  );

  const filtered = content.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (playerName[c.profileId] ?? '').toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) return setError('Select a member.');
    if (!title.trim()) return setError('A title is required.');
    setBusy(true);
    setError(null);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const initRes = await fetch('/api/admin/coaching-content/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ profileId, fileName: file.name, fileSize: file.size }),
        });
        const init = await initRes.json();
        if (!initRes.ok) throw new Error(init.error ?? 'Could not start the upload.');

        const put = await fetch(init.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
        filePath = init.path;
        fileName = file.name;
      }

      const res = await fetch('/api/admin/coaching-content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId, contentType, title, notes, filePath, fileName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save.');

      setContent((prev) => [
        { id: json.id, profileId, contentType, title, notes: notes || null, fileName, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setTitle('');
      setNotes('');
      setFile(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this content? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/coaching-content?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not remove.');
      setContent((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="mt-8 grid gap-10">
      <Card className="p-6">
        <h2 className="display text-[19px]">Assign New Content</h2>
        {demo && <p className="mt-2 text-[12.5px] text-amber">Demo mode — no backend connected.</p>}
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Member
            </span>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            >
              <option value="">Select a member…</option>
              {players.map((p) => (
                <option key={p.profileId} value={p.profileId}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Type
            </span>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'workout' | 'nutrition')}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            >
              <option value="workout">Workout Programming</option>
              <option value="nutrition">Nutrition Coaching</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 1-4 Off-Ice Program"
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white placeholder:text-silver-dim/60"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.1em] text-silver-dim">
              File (optional, 50MB max)
            </span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-[13px] text-silver-dim"
            />
          </label>
          {error && <p className="text-[13px] text-[#ff6b85] sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {busy ? 'Saving…' : 'Assign Content'}
          </button>
        </form>
      </Card>

      <section>
        <h2 className="display text-[19px]">Assigned Content</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by member or title…"
          className="mt-4 w-full max-w-sm rounded-lg border border-white/[.12] bg-white/[.03] px-4 py-2.5 text-[14.5px] text-white placeholder:text-silver-dim focus:border-electric focus:outline-none"
        />
        {filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing assigned yet" body="Content you assign above will show up here." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.1em] text-silver-dim">
                    {playerName[c.profileId] ?? 'Unknown member'} ·{' '}
                    {c.contentType === 'workout' ? 'Workout' : 'Nutrition'}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-white">{c.title}</p>
                  {c.notes && <p className="mt-1 text-[13px] text-silver-dim">{c.notes}</p>}
                  {c.fileName && <p className="mt-1 text-[12px] text-silver-dim">📎 {c.fileName}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-[12.5px] font-semibold text-[#ff6b85] hover:text-[#ff8fa0]"
                >
                  Remove
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
