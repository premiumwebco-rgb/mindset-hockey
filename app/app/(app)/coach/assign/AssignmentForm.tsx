'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssignmentContentType } from '@/lib/assignments';
import type { AssignablePlayer, AssignableMindsetLesson, AssignableWorkoutSession } from '@/lib/assignments';

const CONTENT_TYPES: { value: AssignmentContentType; label: string }[] = [
  { value: 'mindset_lesson', label: 'Mindset Lesson' },
  { value: 'workout_session', label: 'Workout' },
  { value: 'video_review', label: 'Video Review' },
  { value: 'ai_shot_analysis', label: 'AI Shot Analysis' },
];

/**
 * Select Player -> Select Content -> Optional Due Date -> Optional Note ->
 * Save. Only POSTs to /api/coach/assignments — that route is the only place
 * authorization and validation actually happen (assignments_staff_insert).
 */
export default function AssignmentForm({
  players,
  mindsetLessons,
  workoutSessions,
}: {
  players: AssignablePlayer[];
  mindsetLessons: AssignableMindsetLesson[];
  workoutSessions: AssignableWorkoutSession[];
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(players[0]?.profileId ?? '');
  const [contentType, setContentType] = useState<AssignmentContentType>('mindset_lesson');
  const [contentId, setContentId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const needsContent = contentType === 'mindset_lesson' || contentType === 'workout_session';
  const contentOptions = contentType === 'mindset_lesson' ? mindsetLessons : contentType === 'workout_session' ? workoutSessions : [];

  function changeContentType(next: AssignmentContentType) {
    setContentType(next);
    setContentId('');
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!profileId) return setError('Select a player.');
    if (needsContent && !contentId) return setError('Select content to assign.');

    setBusy(true);
    try {
      const res = await fetch('/api/coach/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profileId,
          contentType,
          contentId: needsContent ? contentId : undefined,
          dueAt: dueAt || undefined,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create assignment.');
      setSaved(true);
      setContentId('');
      setDueAt('');
      setNote('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (players.length === 0) {
    return <p className="text-[14px] text-silver-dim">No players have completed onboarding yet.</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Player</span>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            {players.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Assignment type</span>
          <select
            value={contentType}
            onChange={(e) => changeContentType(e.target.value as AssignmentContentType)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsContent && (
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">
            {contentType === 'mindset_lesson' ? 'Lesson' : 'Workout'}
          </span>
          <select
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            <option value="">Select…</option>
            {contentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {contentOptions.length === 0 && (
            <span className="text-[12.5px] text-silver-dim">No published content of this type yet.</span>
          )}
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Due date (optional)</span>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            placeholder="e.g. Focus on your top hand"
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          />
        </label>
      </div>

      {error && <p className="text-[13.5px] text-red-300">{error}</p>}
      {saved && <p className="text-[13.5px] text-[#3ddc84]">Assignment created.</p>}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-electric px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create Assignment'}
        </button>
      </div>
    </form>
  );
}
