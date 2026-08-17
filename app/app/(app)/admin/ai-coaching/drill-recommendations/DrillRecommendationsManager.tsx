'use client';

import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_SHORT_LABEL } from '@/lib/ai/recommendations';
import type { CategoryKey } from '@/lib/ai/rubric';

/* ==========================================================================
   DRILL RECOMMENDATIONS MANAGER  —  ADMIN ONLY

   Every category label below comes from CATEGORY_SHORT_LABEL (lib/ai/
   recommendations.ts) — the same labels the dashboard's AI Insight card and
   /analysis page already show — so this admin screen can never drift out of
   sync with what a player actually sees for "Weight Transfer" etc.

   Nothing here decides WHICH drill gets recommended; it only edits rows in
   ai_drill_recommendations through the API route, which is where the actual
   authorization (requireAdmin + RLS) lives. This component has no
   `if (category === ...)` anywhere — every category/drill/priority pairing
   rendered is data that came back from GET /api/admin/ai-coaching/drill-recommendations.
   ========================================================================== */

const AI_CATEGORIES = Object.keys(CATEGORY_SHORT_LABEL) as CategoryKey[];

interface DrillRow {
  id: string;
  title: string;
  pillar: string | null;
  required_tier: string;
  is_published: boolean;
}

interface MappingRow {
  id: string;
  ai_category: CategoryKey;
  recommendation_kind: string;
  resource_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  training_resources: DrillRow | DrillRow[] | null;
}

function drillOf(m: MappingRow): DrillRow | null {
  return Array.isArray(m.training_resources) ? (m.training_resources[0] ?? null) : m.training_resources;
}

export default function DrillRecommendationsManager() {
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [category, setCategory] = useState<CategoryKey>(AI_CATEGORIES[0]);
  const [resourceId, setResourceId] = useState('');
  const [priority, setPriority] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-coaching/drill-recommendations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load drill recommendations.');
      setMappings(json.mappings ?? []);
      setDrills(json.drills ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMapping() {
    if (!resourceId) {
      setError('Choose a drill.');
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-coaching/drill-recommendations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aiCategory: category, resourceId, priority }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not create that mapping.');
      setNotice('Mapping added.');
      setResourceId('');
      setPriority(1);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function patchMapping(id: string, patch: { priority?: number; isActive?: boolean }) {
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-coaching/drill-recommendations', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not update that mapping.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeMapping(m: MappingRow) {
    const drill = drillOf(m);
    if (!window.confirm(`Remove the mapping to "${drill?.title ?? 'this drill'}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-coaching/drill-recommendations?id=${encodeURIComponent(m.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not remove that mapping.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Move a mapping up/down within its category by swapping priority with its neighbor. */
  async function reorder(catMappings: MappingRow[], index: number, direction: -1 | 1) {
    const other = catMappings[index + direction];
    const current = catMappings[index];
    if (!other) return;
    await Promise.all([
      patchMapping(current.id, { priority: other.priority }),
      patchMapping(other.id, { priority: current.priority }),
    ]);
  }

  const FIELD =
    'w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white placeholder:text-silver-dim/60';
  const LABEL = 'mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim';

  const publishedDrills = drills.filter((d) => d.is_published);
  const unpublishedDrills = drills.filter((d) => !d.is_published);

  return (
    <div className="grid gap-5">
      {/* -------------------------------------------------------- add form */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Add a mapping</h3>
        <p className="mt-2 text-[14px] text-silver-dim">
          When a player&apos;s weakest category matches, this drill is recommended — the
          lowest-priority active mapping for that category wins.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="drc-category" className={LABEL}>AI Category</label>
            <select
              id="drc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              disabled={saving}
              className={FIELD}
            >
              {AI_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_SHORT_LABEL[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="drc-drill" className={LABEL}>Drill</label>
            <select
              id="drc-drill"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={saving}
              className={FIELD}
            >
              <option value="" disabled>Choose a drill…</option>
              {publishedDrills.length > 0 && (
                <optgroup label="Published">
                  {publishedDrills.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </optgroup>
              )}
              {unpublishedDrills.length > 0 && (
                <optgroup label="Draft (not yet visible to members)">
                  {unpublishedDrills.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="drc-priority" className={LABEL}>Priority</label>
            <input
              id="drc-priority"
              type="number"
              min={1}
              value={priority}
              onChange={(e) => setPriority(Math.max(1, Number(e.target.value) || 1))}
              disabled={saving}
              className={FIELD}
            />
            <p className="mt-2 text-[12.5px] text-silver-dim">Lower number = higher priority.</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[13.5px] text-white">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-lg border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] px-4 py-3 text-[13.5px] text-white">
            {notice}
          </p>
        )}

        <button
          onClick={addMapping}
          disabled={saving || !resourceId}
          className="mt-5 inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
        >
          Add mapping
        </button>
      </div>

      {/* ------------------------------------------------------------ list */}
      <div className="card p-6">
        <h3 className="display text-[19px]">Mappings by category</h3>

        {loading ? (
          <p className="mt-3 text-[14px] text-silver-dim">Loading…</p>
        ) : (
          <div className="mt-4 grid gap-6">
            {AI_CATEGORIES.map((cat) => {
              const catMappings = mappings
                .filter((m) => m.ai_category === cat)
                .sort((a, b) => a.priority - b.priority);
              if (catMappings.length === 0) return null;

              return (
                <div key={cat}>
                  <h4 className="text-[12px] font-bold uppercase tracking-[.16em] text-electric-glow">
                    {CATEGORY_SHORT_LABEL[cat]} ({catMappings.length})
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {catMappings.map((m, i) => {
                      const drill = drillOf(m);
                      return (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.08] px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-semibold text-white">
                              {drill?.title ?? 'Unknown drill'}
                            </p>
                            <p className="mt-0.5 text-[12.5px] text-silver-dim">
                              Priority {m.priority}
                              {drill ? ` · ${drill.required_tier === 'premium' ? 'Premium only' : 'Standard and above'}` : ''}
                              {drill && !drill.is_published ? ' · Draft (not visible to members)' : ''}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => reorder(catMappings, i, -1)}
                              disabled={i === 0}
                              aria-label="Move up (higher priority)"
                              className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:border-electric disabled:pointer-events-none disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => reorder(catMappings, i, 1)}
                              disabled={i === catMappings.length - 1}
                              aria-label="Move down (lower priority)"
                              className="rounded-[8px] border border-white/[.14] px-2.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:border-electric disabled:pointer-events-none disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => patchMapping(m.id, { isActive: !m.is_active })}
                              className={`rounded-[8px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                                m.is_active
                                  ? 'border-[#3ddc84]/40 text-[#3ddc84] hover:bg-[#3ddc84]/10'
                                  : 'border-white/20 text-silver-dim hover:border-white/40'
                              }`}
                            >
                              {m.is_active ? 'Active' : 'Disabled'}
                            </button>
                            <button
                              onClick={() => removeMapping(m)}
                              className="rounded-[8px] border border-rink-red/40 px-3 py-1.5 text-[12.5px] font-semibold text-rink-red transition-colors hover:bg-rink-red/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {mappings.length === 0 && (
              <p className="text-[14px] text-silver-dim">
                No mappings yet. Add one above — until then, the dashboard&apos;s AI Insight card
                simply won&apos;t show a recommended drill for any category.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
