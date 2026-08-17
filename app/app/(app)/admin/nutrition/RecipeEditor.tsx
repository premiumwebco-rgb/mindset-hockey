'use client';

import { useState } from 'react';
import { useUnsavedChanges } from './useUnsavedChanges';

/* ==========================================================================
   RECIPE EDITOR

   One screen that edits every field on a recipe plus its ingredients, steps
   and tags, and can preview the result before publishing.

   CHILD ROWS ARE ARRAYS, AND ARRAY POSITION IS SORT ORDER. The API deletes
   and re-inserts them on save, so reordering is just moving an element — the
   admin never sees or types a database id.

   THE PREVIEW IS INTENTIONALLY NOT A SECOND RENDERER. It shows the same
   fields the player page shows, including the estimated-nutrition disclaimer,
   so what you approve is what ships. It reads from local editor state rather
   than the database, which is what makes it a *pre*-publish check.
   ========================================================================== */

const CATEGORIES = [
  'breakfast', 'lunch', 'dinner', 'snacks', 'smoothies',
  'pre_game', 'post_game', 'pre_practice', 'post_practice',
  'pre_workout', 'post_workout', 'recovery', 'road', 'tournament',
];

const TIMING = [
  { key: '3-4h_before', label: '3–4 h before' },
  { key: '2-3h_before', label: '2–3 h before' },
  { key: '1-2h_before', label: '1–2 h before' },
  { key: '30-60m_before', label: '30–60 min before' },
  { key: 'immediately_after', label: 'Immediately after' },
  { key: '1-2h_after', label: '1–2 h after' },
];

const FLAGS = [
  { key: 'is_quick', label: 'Quick' },
  { key: 'is_make_ahead', label: 'Make ahead' },
  { key: 'is_travel_friendly', label: 'Travel friendly' },
  { key: 'is_pre_game', label: 'Pre-game' },
  { key: 'is_post_game', label: 'Post-game' },
  { key: 'is_pre_practice', label: 'Pre-practice' },
  { key: 'is_post_practice', label: 'Post-practice' },
  { key: 'is_pre_workout', label: 'Pre-workout' },
  { key: 'is_post_workout', label: 'Post-workout' },
  { key: 'is_recovery', label: 'Recovery' },
  { key: 'is_tournament', label: 'Tournament' },
] as const;

export interface Ingredient {
  name: string;
  quantity: number | string | null;
  unit: string | null;
  metric_note: string | null;
  optional: boolean;
  notes: string | null;
}

export interface RecipeDraft {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  why_it_works: string | null;
  coach_tip: string | null;
  category: string;
  meal_type: string | null;
  timing: string[];
  prep_minutes: number | string | null;
  cook_minutes: number | string | null;
  servings: number | string;
  calories: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
  fiber_g: number | string | null;
  sodium_mg: number | string | null;
  nutrition_source: string;
  difficulty: string | null;
  equipment: string[];
  status: string;
  required_tier: string;
  sort_order: number | string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  [flag: string]: unknown;
}

export function emptyRecipe(): RecipeDraft {
  const base: RecipeDraft = {
    slug: '', title: '', description: '', why_it_works: '', coach_tip: '',
    category: 'breakfast', meal_type: '', timing: [],
    prep_minutes: '', cook_minutes: '', servings: 1,
    calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sodium_mg: '',
    nutrition_source: 'estimate', difficulty: 'easy', equipment: [],
    status: 'draft', required_tier: 'premium', sort_order: 0,
    ingredients: [], steps: [], tags: [],
  };
  for (const f of FLAGS) base[f.key] = false;
  return base;
}

export default function RecipeEditor({
  draft,
  onCancel,
  onSaved,
}: {
  draft: RecipeDraft;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [d, setD] = useState<RecipeDraft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { isDirty, confirmDiscard, markSaved } = useUnsavedChanges(d);

  /** Cancel routes through the dirty check rather than closing outright. */
  const cancel = () => {
    if (confirmDiscard()) onCancel();
  };

  const set = <K extends keyof RecipeDraft>(k: K, v: RecipeDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  /* ------------------------------------------------------------ children */
  const addIngredient = () =>
    set('ingredients', [
      ...d.ingredients,
      { name: '', quantity: '', unit: '', metric_note: '', optional: false, notes: '' },
    ]);

  const updateIngredient = (i: number, patch: Partial<Ingredient>) =>
    set('ingredients', d.ingredients.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const removeIngredient = (i: number) =>
    set('ingredients', d.ingredients.filter((_, idx) => idx !== i));

  /** Move-up / move-down rather than drag: reliable on a phone, no library. */
  const moveIngredient = (i: number, dir: -1 | 1) => {
    const next = [...d.ingredients];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set('ingredients', next);
  };

  const moveStep = (i: number, dir: -1 | 1) => {
    const next = [...d.steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set('steps', next);
  };

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    // De-duplicated here as well as server-side; the (recipe_id, tag) primary
    // key would reject a repeat, and that is not an error worth showing.
    if (t && !d.tags.includes(t)) set('tags', [...d.tags, t]);
    setTagInput('');
  }

  /* --------------------------------------------------------------- save */
  async function save(nextStatus?: string) {
    setBusy(true);
    setError(null);
    try {
      const payload = { ...d, ...(nextStatus ? { status: nextStatus } : {}) };
      const res = await fetch('/api/admin/nutrition/recipes', {
        method: d.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Could not save that recipe.');
        return;
      }
      // Clear the dirty flag before unmounting so beforeunload does not fire
      // on a form that was, in fact, saved.
      markSaved();
      await onSaved();
    } catch {
      setError('Network error — nothing was saved.');
    } finally {
      setBusy(false);
    }
  }

  const totalMin = (Number(d.prep_minutes) || 0) + (Number(d.cook_minutes) || 0);

  /* ------------------------------------------------------------ preview */
  if (preview) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-[22px]">Preview — what a player sees</h2>
          <div className="flex gap-2">
            <Btn onClick={() => setPreview(false)} label="Back to editing" />
            <Btn onClick={() => save('published')} label="Publish" primary disabled={busy} />
          </div>
        </div>

        <div className="card mt-4 p-5">
          <p className="text-[11px] uppercase tracking-[.14em] text-silver-dim">
            {d.category.replace(/_/g, ' ')}
          </p>
          <h1 className="display mt-1 text-[28px]">{d.title || 'Untitled recipe'}</h1>
          {d.description && <p className="mt-2 text-[15px] text-silver">{d.description}</p>}

          <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-silver">
            <span>⚡ {totalMin} min</span>
            <span>🍽 {d.servings} serving(s)</span>
            {d.protein_g !== '' && <span>💪 {d.protein_g}g protein</span>}
            {d.calories !== '' && <span>🔥 ~{d.calories} cal</span>}
          </div>

          {d.why_it_works && (
            <>
              <h3 className="display mt-5 text-[17px]">Why it works</h3>
              <p className="mt-1 text-[14px] text-silver-dim">{d.why_it_works}</p>
            </>
          )}

          <h3 className="display mt-5 text-[17px]">Ingredients</h3>
          <ul className="mt-2 grid gap-1.5">
            {d.ingredients.filter((i) => i.name).map((i, idx) => (
              <li key={idx} className="text-[14px] text-silver">
                • {[i.quantity, i.unit].filter(Boolean).join(' ')} {i.name}
                {i.metric_note && ` (${i.metric_note})`}
                {i.optional && <span className="ml-1.5 text-[11px] uppercase text-silver-dim">optional</span>}
              </li>
            ))}
            {d.ingredients.filter((i) => i.name).length === 0 && (
              <li className="text-[13.5px] text-silver-dim">No ingredients yet.</li>
            )}
          </ul>

          <h3 className="display mt-5 text-[17px]">Instructions</h3>
          <ol className="mt-2 grid gap-2">
            {d.steps.filter(Boolean).map((s, idx) => (
              <li key={idx} className="text-[14px] text-silver">{idx + 1}. {s}</li>
            ))}
            {d.steps.filter(Boolean).length === 0 && (
              <li className="text-[13.5px] text-silver-dim">No steps yet.</li>
            )}
          </ol>

          <h3 className="display mt-5 text-[17px]">
            {d.nutrition_source === 'estimate' ? 'Estimated nutrition' : 'Nutrition'}
          </h3>
          <p className="mt-1 text-[14px] text-silver">
            {d.calories !== '' && `~${d.calories} cal · `}
            {d.protein_g !== '' && `${d.protein_g}g protein · `}
            {d.carbs_g !== '' && `${d.carbs_g}g carbs · `}
            {d.fat_g !== '' && `${d.fat_g}g fat`}
          </p>
          {/* The same disclaimer the player page prints. Previewing it is the
              point — you approve the honesty label, not just the numbers. */}
          {d.nutrition_source === 'estimate' && (
            <p className="mt-2 text-[12.5px] text-silver-dim">
              These figures are estimates calculated from standard reference amounts. Actual
              values vary with brands, portions and preparation.
            </p>
          )}

          {d.coach_tip && (
            <>
              <h3 className="display mt-5 text-[17px]">Coach tip</h3>
              <p className="mt-1 text-[14px] text-silver">{d.coach_tip}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- editor */
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[22px]">
          {d.id ? 'Edit recipe' : 'New recipe'}
          {isDirty && (
            <span className="ml-2 align-middle text-[11px] font-bold uppercase tracking-[.12em] text-amber">
              Unsaved
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={cancel} label="Cancel" />
          <Btn onClick={() => setPreview(true)} label="Preview" />
          <Btn onClick={() => save()} label="Save" disabled={busy} />
          {d.status !== 'published' && (
            <Btn onClick={() => save('published')} label="Save & publish" primary disabled={busy} />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-400/[.08] px-4 py-3 text-[13.5px] text-red-300">
          {error}
        </p>
      )}

      <Section title="Basics">
        <Field label="Title">
          <input className={INPUT} value={d.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Slug" hint="Leave blank to generate from the title.">
          <input className={INPUT} value={d.slug} onChange={(e) => set('slug', e.target.value)} placeholder="chicken-rice-recovery-bowl" />
        </Field>
        <Field label="Description">
          <textarea className={INPUT} rows={2} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Why it works" hint="Shown above ingredients. The hockey reasoning.">
          <textarea className={INPUT} rows={3} value={d.why_it_works ?? ''} onChange={(e) => set('why_it_works', e.target.value)} />
        </Field>
        <Field label="Coach tip" hint="One practical takeaway.">
          <textarea className={INPUT} rows={2} value={d.coach_tip ?? ''} onChange={(e) => set('coach_tip', e.target.value)} />
        </Field>
      </Section>

      <Section title="Classification">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select className={INPUT} value={d.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Meal type"><input className={INPUT} value={d.meal_type ?? ''} onChange={(e) => set('meal_type', e.target.value)} /></Field>
          <Field label="Difficulty">
            <select className={INPUT} value={d.difficulty ?? ''} onChange={(e) => set('difficulty', e.target.value)}>
              <option value="">—</option>
              <option value="easy">easy</option>
              <option value="moderate">moderate</option>
              <option value="advanced">advanced</option>
            </select>
          </Field>
          <Field label="Required tier">
            <select className={INPUT} value={d.required_tier} onChange={(e) => set('required_tier', e.target.value)}>
              <option value="premium">premium</option>
              <option value="basic">basic</option>
              <option value="none">none</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={INPUT} value={d.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </Field>
          <Field label="Sort order"><input className={INPUT} type="number" min={0} value={String(d.sort_order)} onChange={(e) => set('sort_order', e.target.value)} /></Field>
        </div>

        <Field label="Timing windows">
          <div className="flex flex-wrap gap-1.5">
            {TIMING.map((t) => (
              <Toggle
                key={t.key}
                active={d.timing.includes(t.key)}
                label={t.label}
                onClick={() =>
                  set('timing', d.timing.includes(t.key) ? d.timing.filter((x) => x !== t.key) : [...d.timing, t.key])
                }
              />
            ))}
          </div>
        </Field>

        <Field label="Flags">
          <div className="flex flex-wrap gap-1.5">
            {FLAGS.map((f) => (
              <Toggle key={f.key} active={Boolean(d[f.key])} label={f.label} onClick={() => set(f.key, !d[f.key])} />
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Time & servings">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Prep (min)"><input className={INPUT} type="number" min={0} value={String(d.prep_minutes ?? '')} onChange={(e) => set('prep_minutes', e.target.value)} /></Field>
          <Field label="Cook (min)"><input className={INPUT} type="number" min={0} value={String(d.cook_minutes ?? '')} onChange={(e) => set('cook_minutes', e.target.value)} /></Field>
          <Field label="Servings"><input className={INPUT} type="number" min={1} value={String(d.servings)} onChange={(e) => set('servings', e.target.value)} /></Field>
        </div>
        <Field
          label="Equipment"
          hint="Comma separated. Matters more than it looks — a player in a hotel room needs to know if this needs a blender."
        >
          <input
            className={INPUT}
            value={d.equipment.join(', ')}
            onChange={(e) =>
              set(
                'equipment',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder="blender, rice cooker, microwave"
          />
        </Field>
      </Section>

      <Section title="Nutrition">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Calories"><input className={INPUT} type="number" min={0} value={String(d.calories ?? '')} onChange={(e) => set('calories', e.target.value)} /></Field>
          <Field label="Protein (g)"><input className={INPUT} type="number" min={0} value={String(d.protein_g ?? '')} onChange={(e) => set('protein_g', e.target.value)} /></Field>
          <Field label="Carbs (g)"><input className={INPUT} type="number" min={0} value={String(d.carbs_g ?? '')} onChange={(e) => set('carbs_g', e.target.value)} /></Field>
          <Field label="Fat (g)"><input className={INPUT} type="number" min={0} value={String(d.fat_g ?? '')} onChange={(e) => set('fat_g', e.target.value)} /></Field>
          <Field label="Fiber (g)"><input className={INPUT} type="number" min={0} value={String(d.fiber_g ?? '')} onChange={(e) => set('fiber_g', e.target.value)} /></Field>
          <Field label="Sodium (mg)"><input className={INPUT} type="number" min={0} value={String(d.sodium_mg ?? '')} onChange={(e) => set('sodium_mg', e.target.value)} /></Field>
        </div>
        <Field
          label="Nutrition source"
          hint="Leave as Estimate unless these numbers were checked against a real source. Estimates are labelled as such on the player page."
        >
          <select className={INPUT} value={d.nutrition_source} onChange={(e) => set('nutrition_source', e.target.value)}>
            <option value="estimate">Estimate</option>
            <option value="usda">USDA FoodData Central</option>
            <option value="verified">Verified</option>
          </select>
        </Field>
      </Section>

      <Section title={`Ingredients (${d.ingredients.length})`}>
        <div className="grid gap-2">
          {d.ingredients.map((row, i) => (
            <div key={i} className="rounded-lg border border-white/[.08] bg-navy-900 p-3">
              <div className="grid gap-2 sm:grid-cols-[80px_90px_1fr]">
                <input className={INPUT} placeholder="Qty" value={String(row.quantity ?? '')} onChange={(e) => updateIngredient(i, { quantity: e.target.value })} />
                <input className={INPUT} placeholder="Unit" value={row.unit ?? ''} onChange={(e) => updateIngredient(i, { unit: e.target.value })} />
                <input className={INPUT} placeholder="Ingredient" value={row.name} onChange={(e) => updateIngredient(i, { name: e.target.value })} />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input className={INPUT} placeholder="Metric note (~170 g)" value={row.metric_note ?? ''} onChange={(e) => updateIngredient(i, { metric_note: e.target.value })} />
                <input className={INPUT} placeholder="Notes" value={row.notes ?? ''} onChange={(e) => updateIngredient(i, { notes: e.target.value })} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12.5px] text-silver-dim">
                  <input type="checkbox" checked={row.optional} onChange={(e) => updateIngredient(i, { optional: e.target.checked })} />
                  Optional
                </label>
                <Btn onClick={() => moveIngredient(i, -1)} label="↑" small />
                <Btn onClick={() => moveIngredient(i, 1)} label="↓" small />
                <Btn onClick={() => removeIngredient(i)} label="Remove" small danger />
              </div>
            </div>
          ))}
        </div>
        <Btn onClick={addIngredient} label="+ Add ingredient" />
      </Section>

      <Section title={`Instructions (${d.steps.length})`}>
        <div className="grid gap-2">
          {d.steps.map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-electric/15 text-[13px] font-bold text-electric-glow">{i + 1}</span>
              <textarea
                className={INPUT}
                rows={2}
                value={s}
                onChange={(e) => set('steps', d.steps.map((x, idx) => (idx === i ? e.target.value : x)))}
              />
              <div className="flex shrink-0 flex-col gap-1">
                <Btn onClick={() => moveStep(i, -1)} label="↑" small />
                <Btn onClick={() => moveStep(i, 1)} label="↓" small />
                <Btn onClick={() => set('steps', d.steps.filter((_, idx) => idx !== i))} label="✕" small danger />
              </div>
            </div>
          ))}
        </div>
        <Btn onClick={() => set('steps', [...d.steps, ''])} label="+ Add step" />
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {d.tags.map((t) => (
            <span key={t} className="flex items-center gap-1.5 rounded-md bg-white/[.06] px-2 py-1 text-[12px] text-silver">
              {t}
              <button onClick={() => set('tags', d.tags.filter((x) => x !== t))} className="text-silver-dim hover:text-white">✕</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={INPUT}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="high-protein, post-game, cheap…"
          />
          <Btn onClick={addTag} label="Add" />
        </div>
      </Section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Btn onClick={cancel} label="Cancel" />
        <Btn onClick={() => setPreview(true)} label="Preview" />
        <Btn onClick={() => save()} label="Save" disabled={busy} />
        {d.status !== 'published' && (
          <Btn onClick={() => save('published')} label="Save & publish" primary disabled={busy} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- fragments */

const INPUT =
  'w-full rounded-[10px] border border-white/[.14] bg-ink px-3 py-2 text-[14px] text-white placeholder:text-silver-dim/60';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-4 p-4 sm:p-5">
      <h3 className="display text-[17px]">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-silver-dim">{hint}</p>}
    </div>
  );
}

function Toggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold ${
        active ? 'bg-electric text-white' : 'border border-white/[.14] text-silver-dim hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function Btn({
  onClick, label, primary, danger, small, disabled,
}: {
  onClick: () => void; label: string; primary?: boolean; danger?: boolean; small?: boolean; disabled?: boolean;
}) {
  const cls = danger
    ? 'border border-red-400/40 text-red-300 hover:bg-red-400/10'
    : primary
      ? 'bg-electric text-white hover:bg-electric-glow'
      : 'border border-white/[.14] text-silver hover:text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md font-semibold disabled:opacity-40 ${small ? 'px-2 py-1 text-[11.5px]' : 'px-3.5 py-2 text-[13px]'} ${cls}`}
    >
      {label}
    </button>
  );
}
