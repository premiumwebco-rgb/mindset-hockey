'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RUBRIC } from '@/lib/types';
import { SmartVideo } from '@/components/media/SmartMedia';

interface ScoreState {
  score: number;
  note: string;
}

interface ExistingFeedback {
  id: string;
  body: string;
  complete: boolean;
  created_at: string;
}

export interface ResourcePick {
  id: string;
  title: string;
  pillar: string | null;
}

/* ==========================================================================
   COACH REVIEW EDITOR

   Previously `publish()` was a no-op — `setPublished(true)` on local
   component state with a comment describing an API route that did not exist.
   Nothing survived a page refresh, and a member never received anything.

   This now actually persists to `submission_feedback` (migration 0002) via
   POST /api/coach/reviews/[id]/feedback, and updates video_submissions'
   status/reviewed_at/reviewer_id.

   The 7-point rubric sliders and timestamped notes below are also now saved
   as a STRUCTURED review — analysis_reviews / review_scores /
   review_prescriptions (migration 0001, wired up via lib/video-review-rubric.ts)
   — in addition to the folded written summary in submission_feedback.body.
   A prior version of this file claimed those tables "belong to the AI Shot
   Analysis review flow at /coach/ai-queue, keyed to shot_analyses" — that
   was incorrect; they were unused anywhere in the app. They now persist
   this flow's own per-point scores, so the member-facing /reviews/[id] page
   can render a real radar chart instead of only plain text.

   "Suggested drills" previously filtered `lib/demo-data.ts`'s fake DRILLS
   fixture by a fake rubricPoints tagging — that has been replaced with a
   real multi-select against published `training_resources` (the `resources`
   prop, fetched from the database by the server page, never a fixture).
   ========================================================================== */

function formatMs(ms: number): string {
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
}

export default function ReviewEditor({
  submissionId,
  videoUrl,
  existingFeedback,
  resources,
}: {
  submissionId: string;
  videoUrl: string | null;
  existingFeedback: ExistingFeedback | null;
  resources: ResourcePick[];
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<number, ScoreState>>(
    Object.fromEntries(RUBRIC.map((r) => [r.id, { score: 5, note: '' }]))
  );
  const [summary, setSummary] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasToImprove, setAreasToImprove] = useState('');
  const [annotations, setAnnotations] = useState<{ ms: number; point: number; body: string }[]>([]);
  const [annMs, setAnnMs] = useState('');
  const [annPoint, setAnnPoint] = useState(1);
  const [annBody, setAnnBody] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(existingFeedback?.complete ?? false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  const total = useMemo(
    () => Object.values(scores).reduce((sum, s) => sum + s.score, 0),
    [scores]
  );

  /** The two lowest points become the focus — auto, so it's consistent. */
  const focusPoints = useMemo(
    () =>
      Object.entries(scores)
        .sort((a, b) => a[1].score - b[1].score)
        .slice(0, 2)
        .map(([id]) => Number(id)),
    [scores]
  );

  function toggleResource(id: string) {
    setSelectedResourceIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function setScore(id: number, patch: Partial<ScoreState>) {
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function addAnnotation() {
    const parts = annMs.split(':');
    const ms =
      parts.length === 2
        ? (Number(parts[0]) * 60 + Number(parts[1])) * 1000
        : Number(annMs) * 1000;
    if (!annBody || Number.isNaN(ms)) return;
    setAnnotations((prev) => [...prev, { ms, point: annPoint, body: annBody }].sort((a, b) => a.ms - b.ms));
    setAnnMs('');
    setAnnBody('');
  }

  /** Folds the rubric, timestamped notes and summary into one written review. */
  function composeBody(): string {
    const parts: string[] = [];
    if (summary.trim()) parts.push(summary.trim());

    const scoredPoints = RUBRIC.map((r) => ({ r, s: scores[r.id] })).filter(({ s }) => s.note.trim());
    if (scoredPoints.length) {
      parts.push(
        'Rubric notes:\n' +
          scoredPoints.map(({ r, s }) => `• ${r.label} (${s.score}/10) — ${s.note.trim()}`).join('\n')
      );
    }

    if (annotations.length) {
      parts.push(
        'Timestamped notes:\n' +
          annotations
            .map((a) => `• ${formatMs(a.ms)} — ${RUBRIC.find((r) => r.id === a.point)?.label ?? ''}: ${a.body}`)
            .join('\n')
      );
    }

    parts.push(`Overall: ${total}/${RUBRIC.length * 10}`);
    return parts.join('\n\n');
  }

  async function save(complete: boolean) {
    setError(null);
    setSaving(complete ? 'publish' : 'draft');
    try {
      const res = await fetch(`/api/coach/reviews/${submissionId}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: composeBody(),
          complete,
          scores: RUBRIC.map((r) => ({
            rubricPointId: r.id,
            score: scores[r.id].score,
            note: scores[r.id].note || undefined,
          })),
          overallScore: total,
          strengths,
          areasToImprove,
          resourceIds: selectedResourceIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save the review.');
      if (complete) {
        setPublished(true);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  if (published) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-electric/15 text-[28px]">
          ✓
        </div>
        <h2 className="display text-[26px]">Published</h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-[15px] text-silver-dim">
          Scored {total}/{RUBRIC.length * 10}. The member can now see this feedback on their video review page.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* left — video */}
      <div>
        {videoUrl ? (
          <SmartVideo
            src={videoUrl}
            fallbackLabel="submission"
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-xl border border-white/[.08] bg-navy-900"
          />
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-white/[.14] bg-navy-900">
            <p className="text-[12px] uppercase tracking-[.2em] text-silver-dim">No video stored</p>
          </div>
        )}

        {existingFeedback && (
          <div className="card mt-4 p-5">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              {existingFeedback.complete ? 'Previously published review' : 'Saved draft'}
            </h3>
            <p className="whitespace-pre-line text-[13.5px] text-silver">{existingFeedback.body}</p>
          </div>
        )}

        {/* annotations */}
        <div className="card mt-4 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
            Timestamped notes
          </h3>

          <div className="grid gap-2">
            {/* w-24 fixed + a select at its default width:100% (from
                globals.css) used to add up to more than the row — a genuine
                horizontal-overflow bug on narrow phones. min-w-0 + flex-1 on
                the select lets it actually shrink to the remaining space. */}
            <div className="flex gap-2">
              <input
                aria-label="Timestamp"
                placeholder="0:03"
                value={annMs}
                onChange={(e) => setAnnMs(e.target.value)}
                className="w-20 shrink-0 sm:w-24"
              />
              <select
                aria-label="Rubric point"
                value={annPoint}
                onChange={(e) => setAnnPoint(Number(e.target.value))}
                className="min-w-0 flex-1"
              >
                {RUBRIC.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              aria-label="Note"
              placeholder="Freeze here — weight is still on the back skate."
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
            />
            <button
              type="button"
              onClick={addAnnotation}
              className="min-h-[44px] w-full rounded-lg border border-white/[.14] px-4 py-2.5 text-[13px] font-semibold hover:border-electric hover:text-white sm:w-auto"
            >
              Add note
            </button>
          </div>

          {annotations.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {annotations.map((a, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-white/[.06] bg-ink px-3.5 py-2.5">
                  <span className="shrink-0 font-mono text-[12px] font-semibold text-electric-glow">
                    {formatMs(a.ms)}
                  </span>
                  <span className="min-w-0 text-[13.5px] text-silver">{a.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* right — rubric */}
      <div>
        <div className="card sticky top-4 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="display text-[19px]">7-point rubric</h3>
            <span className="display text-[32px] leading-none">
              {total}
              <span className="text-[14px] text-silver-dim">/{RUBRIC.length * 10}</span>
            </span>
          </div>

          <div className="grid max-h-[46vh] gap-4 overflow-y-auto pr-1">
            {RUBRIC.map((r) => {
              const s = scores[r.id];
              const isFocus = focusPoints.includes(r.id);
              return (
                <div key={r.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      htmlFor={`score-${r.id}`}
                      className={`text-[13.5px] font-semibold ${isFocus ? 'text-electric-glow' : 'text-silver'}`}
                    >
                      {r.label}
                      {isFocus && <span className="ml-1.5 text-[10px] uppercase tracking-wider">focus</span>}
                    </label>
                    <span className="tabular-nums text-[13px] text-silver-dim">{s.score}/10</span>
                  </div>
                  <input
                    id={`score-${r.id}`}
                    type="range"
                    min={1}
                    max={10}
                    value={s.score}
                    onChange={(e) => setScore(r.id, { score: Number(e.target.value) })}
                    className="!p-0 accent-[#0A84FF]"
                  />
                  <input
                    aria-label={`${r.label} note`}
                    placeholder={r.commonFlaw}
                    value={s.note}
                    onChange={(e) => setScore(r.id, { note: e.target.value })}
                    className="mt-1.5 !py-2 !text-[13px]"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t border-white/[.08] pt-4">
            <label htmlFor="summary" className="mb-2 block text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              Coach summary
            </label>
            <textarea
              id="summary"
              rows={4}
              placeholder="Lead with what's working. Then the two things to fix and why they matter."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="mt-4 border-t border-white/[.08] pt-4">
            <label htmlFor="strengths" className="mb-2 block text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              Strengths
            </label>
            <textarea
              id="strengths"
              rows={3}
              placeholder="What's already working well."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="areasToImprove" className="mb-2 block text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              Areas to improve
            </label>
            <textarea
              id="areasToImprove"
              rows={3}
              placeholder="What to fix next, and why it matters."
              value={areasToImprove}
              onChange={(e) => setAreasToImprove(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              Assign resources
            </p>
            {resources.length ? (
              <div className="flex flex-wrap gap-1.5">
                {resources.map((r) => {
                  const active = selectedResourceIds.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleResource(r.id)}
                      className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition ${
                        active
                          ? 'bg-electric text-white'
                          : 'bg-electric/10 text-electric-glow hover:bg-electric/20'
                      }`}
                    >
                      {r.title}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-[12.5px] text-silver-dim">
                No published training resources yet — add one in the resource library.
              </span>
            )}
            <p className="mt-2 text-[11.5px] text-silver-dim">
              Selected resources are attached to this review — the player sees them alongside your
              feedback on their video review page.
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[13.5px] text-white">
              {error}
            </p>
          )}

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={!summary || saving !== null}
              className="w-full rounded-[10px] bg-electric px-6 py-3.5 text-[14px] font-bold text-white hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
            >
              {saving === 'publish'
                ? 'Publishing…'
                : summary
                  ? `Publish review — ${total}/${RUBRIC.length * 10}`
                  : 'Write a summary to publish'}
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!summary || saving !== null}
              className="w-full rounded-[10px] border border-white/[.14] px-6 py-3 text-[13.5px] font-semibold text-silver hover:border-electric hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              {saving === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-silver-dim">
            Submission {submissionId}
          </p>
        </div>
      </div>
    </div>
  );
}
