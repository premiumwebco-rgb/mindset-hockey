'use client';

import { useMemo, useState } from 'react';
import { RUBRIC } from '@/lib/types';
import { DRILLS } from '@/lib/demo-data';

interface ScoreState {
  score: number;
  note: string;
}

export default function ReviewEditor({ submissionId }: { submissionId: string }) {
  const [scores, setScores] = useState<Record<number, ScoreState>>(
    Object.fromEntries(RUBRIC.map((r) => [r.id, { score: 5, note: '' }]))
  );
  const [summary, setSummary] = useState('');
  const [annotations, setAnnotations] = useState<{ ms: number; point: number; body: string }[]>([]);
  const [annMs, setAnnMs] = useState('');
  const [annPoint, setAnnPoint] = useState(1);
  const [annBody, setAnnBody] = useState('');
  const [published, setPublished] = useState(false);

  const total = useMemo(
    () => Object.values(scores).reduce((sum, s) => sum + s.score, 0),
    [scores]
  );

  /** The two lowest points become the month's focus — auto, so it's consistent. */
  const focusPoints = useMemo(
    () =>
      Object.entries(scores)
        .sort((a, b) => a[1].score - b[1].score)
        .slice(0, 2)
        .map(([id]) => Number(id)),
    [scores]
  );

  /** Drill prescriptions are derived from the focus points, not picked by hand. */
  const prescribed = useMemo(
    () => DRILLS.filter((d) => d.rubricPoints.some((p) => focusPoints.includes(p))).slice(0, 3),
    [focusPoints]
  );

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

  function publish() {
    // Production: POST to /api/coach/review with scores, summary, annotations,
    // prescriptions → sets analysis_reviews.published_at and emails the family.
    setPublished(true);
  }

  if (published) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-electric/15 text-[28px]">
          ✓
        </div>
        <h2 className="display text-[26px]">Published</h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-[15px] text-silver-dim">
          Scored {total}/70. The family has been emailed and the three prescribed drills are on next
          week&apos;s plan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* left — video */}
      <div>
        <div className="grid aspect-video place-items-center rounded-xl border border-white/[.08] bg-navy-900">
          <p className="text-[11px] uppercase tracking-[.2em] text-silver-dim">
            Side angle — frame-step
          </p>
        </div>
        <div className="mt-3 grid aspect-video place-items-center rounded-xl border border-white/[.08] bg-navy-900">
          <p className="text-[11px] uppercase tracking-[.2em] text-silver-dim">Front angle</p>
        </div>

        {/* annotations */}
        <div className="card mt-4 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
            Timestamped notes
          </h3>

          <div className="grid gap-2">
            <div className="flex gap-2">
              <input
                aria-label="Timestamp"
                placeholder="0:03"
                value={annMs}
                onChange={(e) => setAnnMs(e.target.value)}
                className="w-24 shrink-0"
              />
              <select
                aria-label="Rubric point"
                value={annPoint}
                onChange={(e) => setAnnPoint(Number(e.target.value))}
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
              className="rounded-lg border border-white/[.14] px-4 py-2.5 text-[13px] font-semibold hover:border-electric hover:text-white"
            >
              Add note
            </button>
          </div>

          {annotations.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {annotations.map((a, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-white/[.06] bg-ink px-3.5 py-2.5">
                  <span className="shrink-0 font-mono text-[12px] font-semibold text-electric-glow">
                    {Math.floor(a.ms / 60000)}:{String(Math.floor((a.ms % 60000) / 1000)).padStart(2, '0')}
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
              <span className="text-[14px] text-silver-dim">/70</span>
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

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-silver-dim">
              Auto-prescribed drills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prescribed.length ? (
                prescribed.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-md bg-electric/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-electric-glow"
                  >
                    {d.title}
                  </span>
                ))
              ) : (
                <span className="text-[12.5px] text-silver-dim">
                  No drill mapped to these points yet — add one to the database.
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={publish}
            disabled={!summary}
            className="mt-5 w-full rounded-[10px] bg-electric px-6 py-3.5 text-[14px] font-bold text-white hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
          >
            {summary ? `Publish review — ${total}/70` : 'Write a summary to publish'}
          </button>
          <p className="mt-2 text-center text-[11.5px] text-silver-dim">
            Submission {submissionId}
          </p>
        </div>
      </div>
    </div>
  );
}
