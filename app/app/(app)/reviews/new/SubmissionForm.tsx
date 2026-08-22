'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateVideo, resolveVideoContentType } from '@/lib/video';
import { uploadWithProgress } from '@/lib/upload-with-progress';

const KINDS = [
  { value: 'game', label: 'Game footage' },
  { value: 'practice', label: 'Practice footage' },
  { value: 'training', label: 'Training / off-ice' },
];

export default function SubmissionForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('game');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'finishing'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) return setError('Pick a video file first.');
    const problem = validateVideo(file);
    if (problem) return setError(problem);
    if (!title.trim()) return setError('Give the submission a title.');

    setBusy(true);
    setStage('uploading');
    setProgress(0);

    try {
      // Step 1 — create the row and get a signed URL to upload straight to.
      const initRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          kind,
          notes,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error || 'Could not start the submission.');

      // Step 2 — PUT the file straight to storage. Never touches this server.
      // Content-Type is resolved explicitly (not just file.type) so it always
      // matches the member-videos bucket's mime allowlist, even when a mobile
      // picker reports an empty/nonstandard file.type for a valid video.
      await uploadWithProgress(init.signedUrl, file, setProgress, resolveVideoContentType(file));

      // Step 3 — confirm the object landed, and move the submission to
      // 'queued' so it appears in the coach queue.
      setStage('finishing');
      const confirmRes = await fetch(`/api/reviews/${init.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmed.error || 'The upload could not be confirmed.');

      router.push('/reviews');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setStage('idle');
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <label className="grid gap-1.5">
        <span className="text-[13px] font-semibold text-white">Video file</span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
          className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white file:mr-3 file:rounded file:border-0 file:bg-electric file:px-3 file:py-1.5 file:text-[13px] file:font-bold file:text-white disabled:opacity-50"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            placeholder="Saturday game — 2nd period"
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white placeholder:text-silver-dim/60 disabled:opacity-50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-semibold text-white">
          What do you want looked at?
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          disabled={busy}
          placeholder="White #17. I keep losing puck battles along the wall and I want to know why."
          className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white placeholder:text-silver-dim/60 disabled:opacity-50"
        />
      </label>

      {stage === 'uploading' && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="h-full rounded-full bg-electric transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12.5px] text-silver-dim">Uploading — {progress}%</p>
        </div>
      )}
      {stage === 'finishing' && (
        <p className="text-[12.5px] text-silver-dim">Confirming upload…</p>
      )}

      {error && (
        <p className="rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[14px] text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[10px] bg-electric px-8 py-4 text-[15px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-40"
      >
        {busy ? 'Submitting…' : 'Submit for Review'}
      </button>
    </form>
  );
}
