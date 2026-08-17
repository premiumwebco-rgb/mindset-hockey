'use client';

import { useCallback, useEffect, useState } from 'react';
import RecipeEditor, { type RecipeDraft, emptyRecipe } from './RecipeEditor';
import SecretSauceEditor, { type SauceDraft, emptySauce } from './SecretSauceEditor';

/* ==========================================================================
   NUTRITION CMS

   NOTHING HERE IS THE SECURITY BOUNDARY. Every action calls an endpoint
   guarded by requireStaff(), and beneath that the 0012 RLS policies require
   auth_is_staff(). This component is the convenience layer.

   The list is filtered SERVER-SIDE — every filter change refetches with query
   params rather than slicing a cached array. That is what keeps the console
   usable at 100+ recipes instead of shipping the whole cookbook to the browser.
   ========================================================================== */

const CATEGORIES = [
  'breakfast', 'lunch', 'dinner', 'snacks', 'smoothies',
  'pre_game', 'post_game', 'pre_practice', 'post_practice',
  'pre_workout', 'post_workout', 'recovery', 'road', 'tournament',
];

const STATUS_TABS = ['all', 'draft', 'published', 'archived'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

interface RecipeRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  required_tier: string;
  difficulty: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  calories: number | null;
  protein_g: number | null;
  nutrition_source: string;
  is_quick: boolean;
  sort_order: number;
  updated_at: string;
}

interface SauceRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  evidence_rating: string;
  status: string;
  sort_order: number;
}

type Counts = Record<string, number>;

export default function NutritionManager({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<'recipes' | 'sauce'>('recipes');

  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [recipeCounts, setRecipeCounts] = useState<Counts>({});
  const [sauces, setSauces] = useState<SauceRow[]>([]);
  const [sauceCounts, setSauceCounts] = useState<Counts>({});

  const [status, setStatus] = useState<StatusTab>('all');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('order');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingRecipe, setEditingRecipe] = useState<RecipeDraft | null>(null);
  const [editingSauce, setEditingSauce] = useState<SauceDraft | null>(null);

  /* ---------------------------------------------------------------- load */
  const loadRecipes = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (category) params.set('category', category);
    if (q.trim()) params.set('q', q.trim());
    if (sort) params.set('sort', sort);

    const res = await fetch(`/api/admin/nutrition/recipes?${params}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Could not load recipes.');
      return;
    }
    setRecipes(json.recipes ?? []);
    setRecipeCounts(json.counts ?? {});
  }, [status, category, q, sort]);

  const loadSauces = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());

    const res = await fetch(`/api/admin/nutrition/secret-sauce?${params}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Could not load Secret Sauce.');
      return;
    }
    setSauces(json.entries ?? []);
    setSauceCounts(json.counts ?? {});
  }, [status, q]);

  useEffect(() => {
    setError(null);
    if (tab === 'recipes') void loadRecipes();
    else void loadSauces();
  }, [tab, loadRecipes, loadSauces]);

  /* -------------------------------------------------------------- actions */
  async function act(fn: () => Promise<Response>, successMessage: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'That action failed.');
        return false;
      }
      setNotice(successMessage);
      if (tab === 'recipes') await loadRecipes();
      else await loadSauces();
      return true;
    } catch {
      setError('Network error — nothing was saved.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const setRecipeStatus = (id: string, next: string) =>
    act(
      () =>
        fetch('/api/admin/nutrition/recipes', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, statusOnly: true, status: next }),
        }),
      next === 'published' ? 'Published.' : next === 'archived' ? 'Archived.' : 'Moved to draft.'
    );

  const setSauceStatus = (id: string, next: string) =>
    act(
      () =>
        fetch('/api/admin/nutrition/secret-sauce', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, statusOnly: true, status: next }),
        }),
      next === 'published' ? 'Published.' : next === 'archived' ? 'Archived.' : 'Moved to draft.'
    );

  const duplicate = (id: string) =>
    act(
      () =>
        fetch('/api/admin/nutrition/recipes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ duplicateOf: id }),
        }),
      'Duplicated as a new draft.'
    );

  async function hardDelete(id: string, kind: 'recipes' | 'secret-sauce', title: string) {
    // Deliberate friction: this is the one action in the CMS that cannot be undone.
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone. Archive instead?`)) {
      return;
    }
    await act(
      () => fetch(`/api/admin/nutrition/${kind}?id=${id}&hard=1`, { method: 'DELETE' }),
      'Permanently deleted.'
    );
  }

  /* ---------------------------------------------------------- open editor */
  async function openRecipe(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/nutrition/recipes/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Could not open that recipe.');
        return;
      }
      setEditingRecipe({
        ...json.recipe,
        ingredients: json.ingredients ?? [],
        steps: (json.steps ?? []).map((s: { body: string }) => s.body),
        tags: json.tags ?? [],
      });
    } finally {
      setBusy(false);
    }
  }

  async function openSauce(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/nutrition/secret-sauce?id=${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Could not open that entry.');
        return;
      }
      setEditingSauce({ ...json.entry, sources: json.sources ?? [] });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- editors */
  if (editingRecipe) {
    return (
      <RecipeEditor
        draft={editingRecipe}
        onCancel={() => setEditingRecipe(null)}
        onSaved={async () => {
          setEditingRecipe(null);
          setNotice('Recipe saved.');
          await loadRecipes();
        }}
      />
    );
  }

  if (editingSauce) {
    return (
      <SecretSauceEditor
        draft={editingSauce}
        onCancel={() => setEditingSauce(null)}
        onSaved={async () => {
          setEditingSauce(null);
          setNotice('Entry saved.');
          await loadSauces();
        }}
      />
    );
  }

  const counts = tab === 'recipes' ? recipeCounts : sauceCounts;

  return (
    <div>
      {/* ------------------------------------------------------------ tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Tile label="Total" value={counts.total ?? 0} />
        <Tile label="Published" value={counts.published ?? 0} />
        <Tile label="Drafts" value={counts.draft ?? 0} />
        <Tile label="Archived" value={counts.archived ?? 0} />
      </div>

      {/* -------------------------------------------------------------- tabs */}
      <div className="mt-5 flex gap-2">
        <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')} label="Recipes" />
        <TabButton active={tab === 'sauce'} onClick={() => setTab('sauce')} label="Secret Sauce" />
      </div>

      {/* ----------------------------------------------------------- filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize ${
              status === s ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or slug…"
          className="min-w-[180px] flex-1 rounded-[10px] border border-white/[.14] bg-ink px-3 py-2 text-[14px] text-white placeholder:text-silver-dim/60"
        />
        {tab === 'recipes' && (
          <>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-[10px] border border-white/[.14] bg-ink px-3 py-2 text-[14px] text-white"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-[10px] border border-white/[.14] bg-ink px-3 py-2 text-[14px] text-white"
            >
              <option value="order">Sort order</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A–Z</option>
            </select>
          </>
        )}
        <button
          onClick={() =>
            tab === 'recipes' ? setEditingRecipe(emptyRecipe()) : setEditingSauce(emptySauce())
          }
          className="rounded-[10px] bg-electric px-4 py-2 text-[14px] font-bold text-white hover:bg-electric-glow"
        >
          + New {tab === 'recipes' ? 'recipe' : 'entry'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-400/[.08] px-4 py-3 text-[13.5px] text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-lg border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] px-4 py-3 text-[13.5px] text-[#3ddc84]">
          {notice}
        </p>
      )}

      {/* ------------------------------------------------------------- list */}
      <div className="mt-5 grid gap-2">
        {tab === 'recipes' &&
          recipes.map((r) => (
            <div key={r.id} className="card p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} />
                    <p className="text-[14.5px] font-semibold text-white">{r.title}</p>
                    {r.nutrition_source === 'estimate' && (
                      <span className="rounded bg-white/[.06] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-silver-dim">
                        Est. macros
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-silver-dim">
                    {r.category.replace(/_/g, ' ')} · {r.required_tier} ·{' '}
                    {(r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)} min
                    {r.protein_g !== null && ` · ${r.protein_g}g protein`}
                    {r.calories !== null && ` · ~${r.calories} cal`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Action onClick={() => openRecipe(r.id)} disabled={busy} label="Edit" />
                  <Action onClick={() => duplicate(r.id)} disabled={busy} label="Duplicate" />
                  {r.status !== 'published' && (
                    <Action onClick={() => setRecipeStatus(r.id, 'published')} disabled={busy} label="Publish" primary />
                  )}
                  {r.status === 'published' && (
                    <Action onClick={() => setRecipeStatus(r.id, 'draft')} disabled={busy} label="Unpublish" />
                  )}
                  {r.status !== 'archived' ? (
                    <Action onClick={() => setRecipeStatus(r.id, 'archived')} disabled={busy} label="Archive" />
                  ) : (
                    <Action onClick={() => setRecipeStatus(r.id, 'draft')} disabled={busy} label="Restore" />
                  )}
                  {isAdmin && r.status === 'archived' && (
                    <Action onClick={() => hardDelete(r.id, 'recipes', r.title)} disabled={busy} label="Delete" danger />
                  )}
                </div>
              </div>
            </div>
          ))}

        {tab === 'sauce' &&
          sauces.map((s) => (
            <div key={s.id} className="card p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={s.status} />
                    <p className="text-[14.5px] font-semibold text-white">{s.title}</p>
                    <EvidencePill rating={s.evidence_rating} />
                  </div>
                  {s.category && (
                    <p className="mt-1 text-[12.5px] text-silver-dim">{s.category}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Action onClick={() => openSauce(s.id)} disabled={busy} label="Edit" />
                  {s.status !== 'published' && (
                    <Action onClick={() => setSauceStatus(s.id, 'published')} disabled={busy} label="Publish" primary />
                  )}
                  {s.status === 'published' && (
                    <Action onClick={() => setSauceStatus(s.id, 'draft')} disabled={busy} label="Unpublish" />
                  )}
                  {s.status !== 'archived' ? (
                    <Action onClick={() => setSauceStatus(s.id, 'archived')} disabled={busy} label="Archive" />
                  ) : (
                    <Action onClick={() => setSauceStatus(s.id, 'draft')} disabled={busy} label="Restore" />
                  )}
                  {isAdmin && s.status === 'archived' && (
                    <Action onClick={() => hardDelete(s.id, 'secret-sauce', s.title)} disabled={busy} label="Delete" danger />
                  )}
                </div>
              </div>
            </div>
          ))}

        {((tab === 'recipes' && recipes.length === 0) ||
          (tab === 'sauce' && sauces.length === 0)) && (
          <div className="card p-8 text-center">
            <p className="text-[14px] text-silver-dim">
              Nothing here yet. Use <span className="text-white">+ New</span> to create the first one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- fragments */

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">{label}</p>
      <p className="display mt-1 text-[24px] leading-none sm:text-[28px]">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${
        active ? 'bg-electric text-white' : 'border border-white/[.1] text-silver-dim hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'published'
      ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
      : status === 'archived'
        ? 'border-white/20 text-silver-dim'
        : 'border-amber/40 bg-amber/10 text-amber';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.12em] ${cls}`}>
      {status}
    </span>
  );
}

function EvidencePill({ rating }: { rating: string }) {
  const cls =
    rating === 'strong'
      ? 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]'
      : rating === 'moderate'
        ? 'border-electric/40 bg-electric/10 text-electric-glow'
        : rating === 'emerging'
          ? 'border-amber/40 bg-amber/10 text-amber'
          : 'border-white/20 text-silver-dim';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.12em] ${cls}`}>
      {rating}
    </span>
  );
}

function Action({
  onClick,
  label,
  disabled,
  primary,
  danger,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const cls = danger
    ? 'border border-red-400/40 text-red-300 hover:bg-red-400/10'
    : primary
      ? 'bg-electric text-white hover:bg-electric-glow'
      : 'border border-white/[.14] text-silver hover:text-white';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40 ${cls}`}
    >
      {label}
    </button>
  );
}
