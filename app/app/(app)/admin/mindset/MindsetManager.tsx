'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   MINDSET TRAINING MANAGER  —  ADMIN ONLY

   Every action calls an endpoint guarded by requireAdmin(); beneath that,
   mindset_lessons' existing RLS write policy (mindset_lessons_admin, 0002)
   requires auth_is_admin(). Hiding this screen from a non-admin proves
   nothing on its own — the server and the database both refuse them
   regardless, exactly like every other admin CMS screen in this app.
   ========================================================================== */

const CATEGORIES = [
  { key: 'confidence', label: 'Confidence' },
  { key: 'visualization', label: 'Visualization' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'focus', label: 'Focus' },
  { key: 'pressure_performance', label: 'Pressure Performance' },
  { key: 'goal_setting', label: 'Goal Setting' },
  { key: 'mental_recovery', label: 'Mental Recovery' },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

interface Lesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  thumbnail_path: string | null;
  video_url: string | null;
  duration_sec: number | null;
  required_tier: string;
  is_published: boolean;
  sort_order: number;
}

const EMPTY_FORM = {
  id: '',
  title: '',
  slug: '',
  description: '',
  category: '' as string,
  videoUrl: '',
  durationSec: '',
  requiredTier: 'premium' as 'basic' | 'premium',
  sortOrder: '0',
};

function prettyDuration(sec: number | null): string {
  if (!sec) return '—';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function MindsetManager() {
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPath, setThumbPath] = useState<string | null>(null);
  const [thumbUploading, setThumbUploading] = useState(false);

  const editing = form.id !== '';

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mindset/lessons');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load mindset lessons.');
      setLessons(json.lessons ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setThumbFile(null);
    setThumbPath(null);
    if (thumbInputRef.current) thumbInputRef.current.value = '';
  }

  function editLesson(l: Lesson) {
    setForm({
      id: l.id,
      title: l.title,
      slug: l.slug,
      description: l.summary ?? '',
      category: l.category ?? '',
      videoUrl: l.video_url ?? '',
      durationSec: l.duration_sec !== null ? String(l.duration_sec) : '',
      requiredTier: l.required_tier === 'basic' ? 'basic' : 'premium',
      sortOrder: String(l.sort_order),
    });
    setThumbPath(l.thumbnail_path);
    setThumbFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadThumbnail(file: File) {
    setError(null);
    setThumbUploading(true);
    try {
      const initRes = await fetch('/api/admin/mindset/thumbnail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? 'Could not start the upload.');

      const put = await fetch(init.signedUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`The upload failed (${put.status}).`);

      setThumbPath(init.path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setThumbUploading(false);
    }
  }

  function pickThumb(f: File | null) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Cover photo must be JPEG, PNG or WebP.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Cover photo must be under 10 MB.');
      return;
    }
    setError(null);
    setThumbFile(f);
    void uploadThumbnail(f);
  }

  async function save() {
    if (form.title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description,
      category: form.category || null,
      videoUrl: form.videoUrl.trim(),
      durationSec: form.durationSec ? Number(form.durationSec) : null,
      requiredTier: form.requiredTier,
      thumbnailPath: thumbPath,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      const res = await fetch('/api/admin/mindset/lessons', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editing ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not save that lesson.');
      setNotice(editing ? 'Lesson updated.' : 'Lesson created as a draft — publish it below when ready.');
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(l: Lesson) {
    setError(null);
    try {
      const res = await fetch('/api/admin/mindset/lessons', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: l.id, isPublished: !l.is_published }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not update that lesson.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reorder(catLessons: Lesson[], index: number, direction: -1 | 1) {
    const other = catLessons[index + direction];
    const current = catLessons[index];
    if (!other) return;
    setError(null);
    try {
      await Promise.all([
        fetch('/api/admin/mindset/lessons', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: current.id, sortOrder: other.sort_order }),
        }),
        fetch('/api/admin/mindset/lessons', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: other.id, sortOrder: current.sort_order }),
        }),
      ]);
      await load();
    } catch {
      setError('Could not reorder those lessons.');
    }
  }

  async function remove(l: Lesson) {
    if (!window.confirm(`Delete "${l.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/mindset/lessons?id=${encodeURIComponent(l.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not delete that lesson.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const FIELD =
    'w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white placeholder:text-silver-dim/60';
  const LABEL = 'mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim';

  return (
    <div className="grid gap-5">
      {/* --------------------------------------------------------- form --- */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="display text-[19px]">{editing ? 'Edit lesson' : 'New lesson'}</h3>
          {editing && (
            <button onClick={resetForm} className="text-[13px] font-semibold text-silver-dim hover:text-white">
              Cancel edit
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4">
          {/* cover photo upload */}
          <div>
            <label htmlFor="mind-thumb" className={LABEL}>Cover photo</label>
            <input
              ref={thumbInputRef}
              id="mind-thumb"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={thumbUploading}
              onChange={(e) => pickThumb(e.target.files?.[0] ?? null)}
              className="block w-full text-[14px] text-silver file:mr-4 file:rounded-[10px] file:border-0 file:bg-electric file:px-4 file:py-2.5 file:text-[13.5px] file:font-bold file:text-white hover:file:bg-electric-glow"
            />
            <p className="mt-2 text-[12.5px] text-silver-dim">
              {thumbUploading
                ? 'Uploading…'
                : thumbPath
                  ? `Saved: ${thumbFile?.name ?? thumbPath.split('/').pop()}`
                  : 'JPEG, PNG or WebP, up to 10 MB.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mind-title" className={LABEL}>Title</label>
              <input
                id="mind-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="The 20-Second Reset"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="mind-slug" className={LABEL}>Slug (optional)</label>
              <input
                id="mind-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="Auto-generated from title if left blank"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="mind-desc" className={LABEL}>Description</label>
            <textarea
              id="mind-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
              rows={2}
              placeholder="What this lesson covers and who it is for."
              className={FIELD}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mind-category" className={LABEL}>Category</label>
              <select
                id="mind-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={FIELD}
              >
                <option value="">Uncategorized</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mind-tier" className={LABEL}>Minimum plan</label>
              <select
                id="mind-tier"
                value={form.requiredTier}
                onChange={(e) => setForm((f) => ({ ...f, requiredTier: e.target.value as 'basic' | 'premium' }))}
                className={FIELD}
              >
                <option value="basic">Standard and above</option>
                <option value="premium">Premium only</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="mind-video" className={LABEL}>Video URL</label>
            <input
              id="mind-video"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://…"
              className={FIELD}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mind-duration" className={LABEL}>Duration (seconds)</label>
              <input
                id="mind-duration"
                type="number"
                min={0}
                value={form.durationSec}
                onChange={(e) => setForm((f) => ({ ...f, durationSec: e.target.value }))}
                placeholder="420"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="mind-sort" className={LABEL}>Sort order</label>
              <input
                id="mind-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className={FIELD}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[13.5px] text-white">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] px-4 py-3 text-[13.5px] text-white">
              {notice}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving || thumbUploading || form.title.trim().length < 3}
            className="inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
          >
            {editing ? 'Save changes' : 'Create lesson'}
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- list --- */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Library</h3>

        {loading ? (
          <p className="mt-3 text-[14px] text-silver-dim">Loading…</p>
        ) : lessons.length === 0 ? (
          <p className="mt-3 text-[14px] text-silver-dim">Nothing uploaded yet.</p>
        ) : (
          <div className="mt-4 grid gap-6">
            {CATEGORIES.map((c) => {
              const inCat = lessons.filter((l) => l.category === c.key).sort((a, b) => a.sort_order - b.sort_order);
              if (inCat.length === 0) return null;
              return (
                <div key={c.key}>
                  <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-electric-glow">
                    {c.label} ({inCat.length})
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {inCat.map((l, i) => (
                      <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.08] px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-semibold text-white">{l.title}</p>
                          <p className="mt-0.5 text-[12.5px] text-silver-dim">
                            {prettyDuration(l.duration_sec)} · {l.required_tier === 'premium' ? 'Premium only' : 'Standard and above'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button onClick={() => reorder(inCat, i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white hover:border-electric disabled:pointer-events-none disabled:opacity-30">↑</button>
                          <button onClick={() => reorder(inCat, i, 1)} disabled={i === inCat.length - 1} aria-label="Move down" className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white hover:border-electric disabled:pointer-events-none disabled:opacity-30">↓</button>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] ${l.is_published ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]' : 'border-white/20 text-silver-dim'}`}>
                            {l.is_published ? 'Live' : 'Draft'}
                          </span>
                          <button onClick={() => togglePublish(l)} className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric">
                            {l.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button onClick={() => editLesson(l)} className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric">
                            Edit
                          </button>
                          <button onClick={() => remove(l)} className="rounded-[8px] border border-rink-red/40 px-3 py-1.5 text-[12.5px] font-semibold text-rink-red hover:bg-rink-red/10">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {lessons.some((l) => !l.category) && (
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-amber">
                  Uncategorized ({lessons.filter((l) => !l.category).length})
                </h4>
                <div className="mt-2 grid gap-2">
                  {lessons.filter((l) => !l.category).map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/30 px-4 py-3">
                      <p className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-white">{l.title}</p>
                      <button onClick={() => editLesson(l)} className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric">
                        File under a category
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
