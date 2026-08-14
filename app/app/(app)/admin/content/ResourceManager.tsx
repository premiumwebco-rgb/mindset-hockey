'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   TRAINING RESOURCE MANAGER  —  ADMIN / COACH

   Upload, publish, and delete training videos, PDFs and images.

   THE FILE NEVER PASSES THROUGH THE APP SERVER.
   POST /api/admin/resources creates the catalogue row and returns a signed
   URL; the browser PUTs the file straight to Supabase Storage. That is what
   allows a 500 MB coach video to upload at all — a serverless request body
   could never carry it.

   NOTHING HERE IS THE SECURITY BOUNDARY. Every action calls an endpoint
   guarded by requireStaff(), and beneath that the storage and table policies
   from migration 0008 require auth_is_staff(). Hiding this component from a
   member would prove nothing; the server refuses them regardless.
   ========================================================================== */

const ACCEPT =
  'video/mp4,video/quicktime,video/webm,application/pdf,image/jpeg,image/png,image/webp,.mp4,.mov,.webm,.pdf,.jpg,.jpeg,.png,.webp';

const MAX_BYTES = 500 * 1024 * 1024;

/**
 * The six pillars. Exactly one per lesson — no "none", no "other", no
 * multi-select. Mirrors the API validator and the database CHECK constraint
 * in migration 0009; those are the real enforcement.
 */
const PILLARS = [
  { key: 'mindset', label: 'Mindset' },
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'skill', label: 'Skill' },
  { key: 'systems', label: 'Systems' },
  { key: 'habits', label: 'Habits' },
  { key: 'leadership', label: 'Leadership' },
] as const;

type PillarKey = (typeof PILLARS)[number]['key'];

const PILLAR_LABEL: Record<string, string> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p.label])
);

interface Resource {
  id: string;
  title: string;
  kind: string;
  pillar: string | null;
  category: string | null;
  required_tier: string;
  is_published: boolean;
  size_bytes: number | null;
  duration_sec: number | null;
  created_at: string;
}

type Phase = 'idle' | 'creating' | 'uploading' | 'done' | 'error';

function prettySize(bytes: number | null): string {
  if (!bytes) return '—';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Reads a video's running time so the library card can print "6:20".
 *
 * PURELY COSMETIC. There is no length limit on training resources and no
 * incentive for the uploading admin to lie, so a browser-reported number is
 * fine here. This is NOT the AI Shot Analysis duration check — that one is
 * adversarial and is verified server-side from the stored file's own container
 * header in lib/ai/duration.ts. Do not reuse this function for that purpose.
 *
 * Resolves null on anything unreadable; a missing duration just omits the badge.
 */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) return resolve(null);
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const d = el.duration;
      done(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
    };
    el.onerror = () => done(null);
    el.src = url;
    // Never let a stuck decode block the upload form.
    setTimeout(() => done(null), 8000);
  });
}

function validate(file: File): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_BYTES) {
    return `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}

export default function ResourceManager() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [requiredTier, setRequiredTier] = useState<'basic' | 'premium'>('basic');
  // No default — the admin must choose. An unchosen pillar blocks upload.
  const [pillar, setPillar] = useState<PillarKey | ''>('');
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/resources');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load resources.');
      setResources(json.resources ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pick(f: File | null) {
    if (!f) return;
    const problem = validate(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(f);
    // Sensible default title from the filename; the admin can overwrite it.
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    setDurationSec(null);
    void readDuration(f).then(setDurationSec);
  }

  async function upload() {
    if (!file || !title.trim()) {
      setError('A file and a title are both required.');
      return;
    }
    if (!pillar) {
      setError('Choose a pillar. Every lesson belongs to exactly one.');
      return;
    }
    setError(null);
    setNotice(null);

    try {
      // 1. Reserve the catalogue row + get a signed upload URL.
      setPhase('creating');
      setProgress(5);
      const initRes = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          category,
          pillar,
          requiredTier,
          durationSec,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? 'Could not start the upload.');

      // 2. PUT the file straight to storage.
      setPhase('uploading');
      setProgress(20);
      const put = await fetch(init.signedUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) {
        throw new Error(
          `The upload failed (${put.status}). If this persists, check the training-resources bucket exists.`
        );
      }

      setProgress(100);
      setPhase('done');
      setNotice(
        `"${title.trim()}" uploaded. It is saved as a draft — publish it below when you are ready for members to see it.`
      );

      // Reset the form, keep the category for the next upload in a batch.
      setFile(null);
      setTitle('');
      setDescription('');
      setDurationSec(null);
      if (inputRef.current) inputRef.current.value = '';
      await load();
    } catch (err) {
      setPhase('error');
      setError((err as Error).message);
    }
  }

  async function togglePublish(r: Resource) {
    setError(null);
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: r.id, isPublished: !r.is_published }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not update that resource.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Move a resource into a pillar (used by the "needs a pillar" section). */
  async function refile(r: Resource, newPillar: string) {
    setError(null);
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: r.id, pillar: newPillar }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not re-file that resource.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(r: Resource) {
    if (!window.confirm(`Delete "${r.title}"? This also removes the stored file.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/resources?id=${encodeURIComponent(r.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not delete that resource.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const busy = phase === 'creating' || phase === 'uploading';
  const FIELD =
    'w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white placeholder:text-silver-dim/60';
  const LABEL =
    'mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim';

  return (
    <div className="grid gap-5">
      {/* ---------------------------------------------------------- upload */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Upload a training resource</h3>
        <p className="mt-2 text-[14px] text-silver-dim">
          Video, PDF or image, up to 500 MB. Uploads save as a draft — nothing is visible to
          members until you publish it.
        </p>

        <div className="mt-5 grid gap-4">
          <div>
            <label htmlFor="res-file" className={LABEL}>
              File
            </label>
            <input
              ref={inputRef}
              id="res-file"
              type="file"
              accept={ACCEPT}
              disabled={busy}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="block w-full text-[14px] text-silver file:mr-4 file:rounded-[10px] file:border-0 file:bg-electric file:px-4 file:py-2.5 file:text-[13.5px] file:font-bold file:text-white hover:file:bg-electric-glow"
            />
            {file && (
              <p className="mt-2 text-[13px] text-silver-dim">
                {file.name} · {prettySize(file.size)}
                {durationSec !== null &&
                  ` · ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`}
              </p>
            )}
            <p className="mt-2 text-[12.5px] text-silver-dim">
              No length limit — a full lesson can run 6, 11 or 20 minutes. The 5-second cap applies
              only to AI Shot Analysis clips, which is a separate upload.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="res-title" className={LABEL}>
                Title
              </label>
              <input
                id="res-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                placeholder="Wrist shot — weight transfer"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="res-category" className={LABEL}>
                Category (optional)
              </label>
              <input
                id="res-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={busy}
                placeholder="Shooting"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="res-desc" className={LABEL}>
              Description (optional)
            </label>
            <textarea
              id="res-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              disabled={busy}
              rows={2}
              placeholder="What this covers and who it is for."
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="res-pillar" className={LABEL}>
              Pillar <span className="text-rink-red">*</span>
            </label>
            <select
              id="res-pillar"
              value={pillar}
              onChange={(e) => setPillar(e.target.value as PillarKey | '')}
              disabled={busy}
              required
              className={FIELD}
            >
              <option value="" disabled>
                Choose a pillar…
              </option>
              {PILLARS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[12.5px] text-silver-dim">
              Every lesson belongs to exactly one pillar — nothing loose, nothing
              uncategorized.
            </p>
          </div>

          <div>
            <label htmlFor="res-tier" className={LABEL}>
              Minimum plan
            </label>
            <select
              id="res-tier"
              value={requiredTier}
              onChange={(e) => setRequiredTier(e.target.value as 'basic' | 'premium')}
              disabled={busy}
              className={FIELD}
            >
              <option value="basic">Standard and above</option>
              <option value="premium">Premium only</option>
            </select>
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

          {busy ? (
            <div>
              <div className="flex items-center justify-between text-[13.5px]">
                <span className="font-semibold text-white">
                  {phase === 'creating' ? 'Preparing upload…' : 'Uploading…'}
                </span>
                <span className="tabular-nums text-silver-dim">{progress}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-700">
                <div
                  className="h-full rounded-full bg-electric transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-[12.5px] text-silver-dim">
                Keep this tab open until it finishes.
              </p>
            </div>
          ) : (
            <button
              onClick={upload}
              disabled={!file || !title.trim() || !pillar}
              className="inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
            >
              Upload resource
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- list */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Library</h3>

        {loading ? (
          <p className="mt-3 text-[14px] text-silver-dim">Loading…</p>
        ) : resources.length === 0 ? (
          <p className="mt-3 text-[14px] text-silver-dim">
            Nothing uploaded yet. The first resource you add will appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-6">
            {PILLARS.map((p) => {
              const inPillar = resources.filter((r) => r.pillar === p.key);
              if (inPillar.length === 0) return null;
              return (
                <div key={p.key}>
                  <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-electric-glow">
                    {p.label} ({inPillar.length})
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {inPillar.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.08] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-white">{r.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-silver-dim">
                    {r.pillar ? `${PILLAR_LABEL[r.pillar]} · ` : ''}
                    {r.kind} · {prettySize(r.size_bytes)}
                    {r.duration_sec
                      ? ` · ${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, '0')}`
                      : ''}
                    {r.category ? ` · ${r.category}` : ''} ·{' '}
                    {r.required_tier === 'premium' ? 'Premium only' : 'Standard and above'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] ${
                      r.is_published
                        ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
                        : 'border-white/20 text-silver-dim'
                    }`}
                  >
                    {r.is_published ? 'Live' : 'Draft'}
                  </span>
                  <button
                    onClick={() => togglePublish(r)}
                    className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:border-electric"
                  >
                    {r.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="rounded-[8px] border border-rink-red/40 px-3 py-1.5 text-[12.5px] font-semibold text-rink-red transition-colors hover:bg-rink-red/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Anything the pillar backfill could not place. Migration 0009
                forces these back to draft so they can never reach the public
                library uncategorized — they just need re-filing here. */}
            {resources.some((r) => !r.pillar) && (
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-amber">
                  Needs a pillar ({resources.filter((r) => !r.pillar).length})
                </h4>
                <p className="mt-1 text-[12.5px] text-silver-dim">
                  These cannot be published until they are filed under a pillar.
                </p>
                <div className="mt-2 grid gap-2">
                  {resources
                    .filter((r) => !r.pillar)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/30 px-4 py-3"
                      >
                        <p className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-white">
                          {r.title}
                        </p>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) void refile(r, e.target.value);
                          }}
                          className="rounded-[8px] border border-white/[.14] bg-ink px-3 py-1.5 text-[12.5px] text-white"
                        >
                          <option value="" disabled>
                            File under…
                          </option>
                          {PILLARS.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
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
