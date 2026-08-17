'use client';

import { useCallback, useEffect, useState } from 'react';

/* ==========================================================================
   WORKOUT ROUTINES MANAGER  —  ADMIN ONLY

   Every action calls /api/admin/workouts/routines, which is guarded by
   requireAdmin(); beneath that, workout_plans/workout_sessions' existing RLS
   write policies (workout_plans_admin / workout_sessions_admin, 0002) both
   require auth_is_admin(). Hiding this screen from a non-admin proves
   nothing on its own — the server and the database both refuse them
   regardless, same convention as every other admin CMS screen here.

   OCCASION / DIFFICULTY lists below are a deliberate local copy of
   ROUTINE_OCCASIONS / OCCASION_LABEL / ROUTINE_DIFFICULTIES from
   lib/data.ts — that module imports the server-only Supabase client, so it
   cannot be imported into a 'use client' component. Keep this list in sync
   with lib/data.ts if occasions or difficulties ever change.
   ========================================================================== */

const OCCASIONS = [
  { key: 'pre-game', label: 'Pre-Game' },
  { key: 'pre-practice', label: 'Pre-Practice' },
  { key: 'post-practice-recovery', label: 'Post-Practice Recovery' },
  { key: 'game-day', label: 'Game Day' },
  { key: 'strength-day', label: 'Strength Day' },
  { key: 'speed-agility', label: 'Speed & Agility' },
  { key: 'recovery-day', label: 'Recovery Day' },
  { key: 'off-ice-shooting', label: 'Off-Ice Shooting' },
  { key: 'travel-hotel', label: 'Travel / Hotel' },
  { key: 'quick-15', label: 'Quick 15-Minute' },
] as const;

const DIFFICULTIES = ['easy', 'moderate', 'advanced'] as const;

interface Exercise {
  name: string;
  duration?: string;
  sets?: number;
  reps?: string;
  rest?: string;
  instructions: string;
}

interface Section {
  name: string;
  items: Exercise[];
}

interface SessionRow {
  id: string;
  duration_min: number | null;
  blocks: {
    difficulty?: string | null;
    whenToUse?: string;
    coachTip?: string;
    equipment?: string[];
    sections?: Section[];
  } | null;
}

interface Routine {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  focus: string;
  required_tier: string;
  is_published: boolean;
  sort_order: number;
  workout_sessions: SessionRow | SessionRow[] | null;
}

function sessionOf(r: Routine): SessionRow | null {
  return Array.isArray(r.workout_sessions) ? (r.workout_sessions[0] ?? null) : r.workout_sessions;
}

const EMPTY_FORM = {
  id: '',
  title: '',
  slug: '',
  description: '',
  occasion: 'pre-game' as string,
  requiredTier: 'basic' as 'basic' | 'premium',
  durationMin: '',
  difficulty: 'easy' as string,
  whenToUse: '',
  coachTip: '',
  equipment: '',
  sortOrder: '0',
};

const EMPTY_SECTION: Section = { name: '', items: [] };
const EMPTY_EXERCISE: Exercise = { name: '', instructions: '' };

export default function WorkoutManager() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [sections, setSections] = useState<Section[]>([]);

  const editing = form.id !== '';

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workouts/routines');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load workout routines.');
      setRoutines(json.routines ?? []);
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
    setSections([]);
  }

  function editRoutine(r: Routine) {
    const s = sessionOf(r);
    setForm({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description ?? '',
      occasion: r.focus,
      requiredTier: r.required_tier === 'premium' ? 'premium' : 'basic',
      durationMin: s?.duration_min !== null && s?.duration_min !== undefined ? String(s.duration_min) : '',
      difficulty: s?.blocks?.difficulty ?? 'easy',
      whenToUse: s?.blocks?.whenToUse ?? '',
      coachTip: s?.blocks?.coachTip ?? '',
      equipment: (s?.blocks?.equipment ?? []).join(', '),
      sortOrder: String(r.sort_order),
    });
    setSections(s?.blocks?.sections ?? []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addSection() {
    setSections((prev) => [...prev, { ...EMPTY_SECTION }]);
  }
  function removeSection(i: number) {
    setSections((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateSectionName(i: number, name: string) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
  }
  function addExercise(sectionIdx: number) {
    setSections((prev) =>
      prev.map((s, idx) => (idx === sectionIdx ? { ...s, items: [...s.items, { ...EMPTY_EXERCISE }] } : s))
    );
  }
  function removeExercise(sectionIdx: number, itemIdx: number) {
    setSections((prev) =>
      prev.map((s, idx) => (idx === sectionIdx ? { ...s, items: s.items.filter((_, i) => i !== itemIdx) } : s))
    );
  }
  function updateExercise(sectionIdx: number, itemIdx: number, patch: Partial<Exercise>) {
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === sectionIdx
          ? { ...s, items: s.items.map((it, i) => (i === itemIdx ? { ...it, ...patch } : it)) }
          : s
      )
    );
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
      occasion: form.occasion,
      requiredTier: form.requiredTier,
      durationMin: form.durationMin ? Number(form.durationMin) : null,
      difficulty: form.difficulty,
      whenToUse: form.whenToUse,
      coachTip: form.coachTip,
      equipment: form.equipment
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
      sections,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      const res = await fetch('/api/admin/workouts/routines', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editing ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not save that routine.');
      setNotice(editing ? 'Routine updated.' : 'Routine created as a draft — publish it below when ready.');
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(r: Routine) {
    setError(null);
    try {
      const res = await fetch('/api/admin/workouts/routines', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: r.id, isPublished: !r.is_published }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not update that routine.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(r: Routine) {
    if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/workouts/routines?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not delete that routine.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reorder(group: Routine[], index: number, direction: -1 | 1) {
    const other = group[index + direction];
    const current = group[index];
    if (!other) return;
    setError(null);
    try {
      await Promise.all([
        fetch('/api/admin/workouts/routines', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: current.id, sortOrder: other.sort_order }),
        }),
        fetch('/api/admin/workouts/routines', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: other.id, sortOrder: current.sort_order }),
        }),
      ]);
      await load();
    } catch {
      setError('Could not reorder those routines.');
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
          <h3 className="display text-[19px]">{editing ? 'Edit routine' : 'New routine'}</h3>
          {editing && (
            <button onClick={resetForm} className="text-[13px] font-semibold text-silver-dim hover:text-white">
              Cancel edit
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wk-title" className={LABEL}>Title</label>
              <input
                id="wk-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Pre-Game Activation"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="wk-slug" className={LABEL}>Slug (optional)</label>
              <input
                id="wk-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="Auto-generated from title if left blank"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="wk-desc" className={LABEL}>Description</label>
            <textarea
              id="wk-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
              rows={2}
              placeholder="What this routine is for and when to run it."
              className={FIELD}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="wk-occasion" className={LABEL}>Occasion / category</label>
              <select
                id="wk-occasion"
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                className={FIELD}
              >
                {OCCASIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wk-difficulty" className={LABEL}>Difficulty</label>
              <select
                id="wk-difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                className={FIELD}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wk-tier" className={LABEL}>Required plan</label>
              <select
                id="wk-tier"
                value={form.requiredTier}
                onChange={(e) => setForm((f) => ({ ...f, requiredTier: e.target.value as 'basic' | 'premium' }))}
                className={FIELD}
              >
                <option value="basic">Standard and above</option>
                <option value="premium">Premium only</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wk-duration" className={LABEL}>Duration (minutes)</label>
              <input
                id="wk-duration"
                type="number"
                min={0}
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
                placeholder="15"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="wk-equipment" className={LABEL}>Equipment (comma-separated)</label>
              <input
                id="wk-equipment"
                value={form.equipment}
                onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                placeholder="None, or e.g. Resistance band, Foam roller"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="wk-when" className={LABEL}>When to use it</label>
            <input
              id="wk-when"
              value={form.whenToUse}
              onChange={(e) => setForm((f) => ({ ...f, whenToUse: e.target.value }))}
              placeholder="60-90 minutes before puck drop"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="wk-tip" className={LABEL}>Coach tip / general instructions</label>
            <textarea
              id="wk-tip"
              value={form.coachTip}
              onChange={(e) => setForm((f) => ({ ...f, coachTip: e.target.value.slice(0, 1000) }))}
              rows={2}
              placeholder="Overall coaching note shown above the exercise list."
              className={FIELD}
            />
          </div>

          {/* ----------------------------------------------- sections/exercises */}
          <div>
            <div className="flex items-center justify-between">
              <p className={LABEL}>Exercises / blocks</p>
              <button
                onClick={addSection}
                className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric"
              >
                + Add section
              </button>
            </div>

            {sections.length === 0 && (
              <p className="text-[13px] text-silver-dim">
                No sections yet — add one (e.g. &quot;Warm-Up&quot;) and then add exercises to it.
              </p>
            )}

            <div className="grid gap-4">
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="rounded-xl border border-white/[.1] p-4">
                  <div className="flex items-center gap-2">
                    <input
                      value={section.name}
                      onChange={(e) => updateSectionName(sIdx, e.target.value)}
                      placeholder="Section name, e.g. WARM-UP"
                      className={`${FIELD} flex-1`}
                    />
                    <button
                      onClick={() => removeSection(sIdx)}
                      className="shrink-0 rounded-[8px] border border-rink-red/40 px-3 py-1.5 text-[12.5px] font-semibold text-rink-red hover:bg-rink-red/10"
                    >
                      Remove section
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {section.items.map((item, iIdx) => (
                      <div key={iIdx} className="grid gap-2 rounded-lg border border-white/[.08] p-3">
                        <div className="grid gap-2 sm:grid-cols-4">
                          <input
                            value={item.name}
                            onChange={(e) => updateExercise(sIdx, iIdx, { name: e.target.value })}
                            placeholder="Exercise name"
                            className={`${FIELD} sm:col-span-2`}
                          />
                          <input
                            value={item.duration ?? ''}
                            onChange={(e) => updateExercise(sIdx, iIdx, { duration: e.target.value })}
                            placeholder="Duration (e.g. 2 min)"
                            className={FIELD}
                          />
                          <input
                            value={item.reps ?? ''}
                            onChange={(e) => updateExercise(sIdx, iIdx, { reps: e.target.value })}
                            placeholder="Reps (e.g. 10)"
                            className={FIELD}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <input
                            type="number"
                            min={0}
                            value={item.sets ?? ''}
                            onChange={(e) =>
                              updateExercise(sIdx, iIdx, { sets: e.target.value ? Number(e.target.value) : undefined })
                            }
                            placeholder="Sets"
                            className={FIELD}
                          />
                          <input
                            value={item.rest ?? ''}
                            onChange={(e) => updateExercise(sIdx, iIdx, { rest: e.target.value })}
                            placeholder="Rest (e.g. 30 sec)"
                            className={FIELD}
                          />
                          <input
                            value={item.instructions}
                            onChange={(e) => updateExercise(sIdx, iIdx, { instructions: e.target.value })}
                            placeholder="Instructions"
                            className={`${FIELD} sm:col-span-2`}
                          />
                        </div>
                        <button
                          onClick={() => removeExercise(sIdx, iIdx)}
                          className="justify-self-start text-[12px] font-semibold text-rink-red hover:underline"
                        >
                          Remove exercise
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addExercise(sIdx)}
                      className="justify-self-start rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric"
                    >
                      + Add exercise
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="wk-sort" className={LABEL}>Sort order</label>
            <input
              id="wk-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className={`${FIELD} max-w-[160px]`}
            />
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
            disabled={saving || form.title.trim().length < 3}
            className="inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
          >
            {editing ? 'Save changes' : 'Create routine'}
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- list --- */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Routines</h3>

        {loading ? (
          <p className="mt-3 text-[14px] text-silver-dim">Loading…</p>
        ) : routines.length === 0 ? (
          <p className="mt-3 text-[14px] text-silver-dim">Nothing created yet.</p>
        ) : (
          <div className="mt-4 grid gap-6">
            {OCCASIONS.map((o) => {
              const group = routines.filter((r) => r.focus === o.key).sort((a, b) => a.sort_order - b.sort_order);
              if (group.length === 0) return null;
              return (
                <div key={o.key}>
                  <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-electric-glow">
                    {o.label} ({group.length})
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {group.map((r, i) => {
                      const s = sessionOf(r);
                      return (
                        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.08] px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-semibold text-white">{r.title}</p>
                            <p className="mt-0.5 text-[12.5px] text-silver-dim">
                              {s?.duration_min ? `${s.duration_min} min` : 'No duration set'} ·{' '}
                              {r.required_tier === 'premium' ? 'Premium only' : 'Standard and above'}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            <button onClick={() => reorder(group, i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white hover:border-electric disabled:pointer-events-none disabled:opacity-30">↑</button>
                            <button onClick={() => reorder(group, i, 1)} disabled={i === group.length - 1} aria-label="Move down" className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white hover:border-electric disabled:pointer-events-none disabled:opacity-30">↓</button>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] ${r.is_published ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]' : 'border-white/20 text-silver-dim'}`}>
                              {r.is_published ? 'Live' : 'Draft'}
                            </span>
                            <button onClick={() => togglePublish(r)} className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric">
                              {r.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => editRoutine(r)} className="rounded-[8px] border border-white/[.14] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:border-electric">
                              Edit
                            </button>
                            <button onClick={() => remove(r)} className="rounded-[8px] border border-rink-red/40 px-3 py-1.5 text-[12.5px] font-semibold text-rink-red hover:bg-rink-red/10">
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
