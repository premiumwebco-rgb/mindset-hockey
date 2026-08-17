'use client';

import { useState } from 'react';
import { useUnsavedChanges } from './useUnsavedChanges';

/* ==========================================================================
   SECRET SAUCE EDITOR

   This content covers caffeine, sodium bicarbonate, creatine and similar
   topics for an audience that includes teenagers. Two things follow from that,
   and both are baked into this form rather than left to discipline:

     1. "Who should avoid" and "Side effects" sit directly beneath "Dosage",
        not in a collapsed section further down. A dose without its cautions is
        the failure mode worth designing against.

     2. Sources are organization + title + year. URL and DOI exist but are
        optional and never auto-filled — an unverified link that looks
        authoritative is worse than no link. Leave them blank until checked.
   ========================================================================== */

const EVIDENCE = [
  { key: 'strong', label: 'Strong', hint: 'Consistent support across good-quality research.' },
  { key: 'moderate', label: 'Moderate', hint: 'Reasonable support, some inconsistency.' },
  { key: 'emerging', label: 'Emerging', hint: 'Promising but early or limited.' },
  { key: 'limited', label: 'Limited', hint: 'Weak, conflicting, or largely anecdotal.' },
];

export interface Source {
  organization: string;
  title: string;
  publication_year: number | string | null;
  source_type: string | null;
  url: string | null;
  doi: string | null;
}

export interface SauceDraft {
  id?: string;
  slug: string;
  title: string;
  category: string | null;
  what_it_is: string | null;
  why_it_may_work: string | null;
  when_to_use: string | null;
  how_to_use: string | null;
  dosage: string | null;
  who_should_avoid: string | null;
  side_effects: string | null;
  practical_example: string | null;
  evidence_rating: string;
  status: string;
  required_tier: string;
  sort_order: number | string;
  sources: Source[];
}

export function emptySauce(): SauceDraft {
  return {
    slug: '', title: '', category: '',
    what_it_is: '', why_it_may_work: '', when_to_use: '', how_to_use: '',
    dosage: '', who_should_avoid: '', side_effects: '', practical_example: '',
    evidence_rating: 'limited', status: 'draft', required_tier: 'premium',
    sort_order: 0, sources: [],
  };
}

export default function SecretSauceEditor({
  draft,
  onCancel,
  onSaved,
}: {
  draft: SauceDraft;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [d, setD] = useState<SauceDraft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const { isDirty, confirmDiscard, markSaved } = useUnsavedChanges(d);

  /** Cancel routes through the dirty check rather than closing outright. */
  const cancel = () => {
    if (confirmDiscard()) onCancel();
  };

  const set = <K extends keyof SauceDraft>(k: K, v: SauceDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  const updateSource = (i: number, patch: Partial<Source>) =>
    set('sources', d.sources.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  async function save(nextStatus?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/nutrition/secret-sauce', {
        method: d.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...d, ...(nextStatus ? { status: nextStatus } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Could not save that entry.');
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

  if (preview) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-[22px]">Preview</h2>
          <div className="flex gap-2">
            <Btn onClick={() => setPreview(false)} label="Back to editing" />
            <Btn onClick={() => save('published')} label="Publish" primary disabled={busy} />
          </div>
        </div>

        <div className="card mt-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-[26px]">{d.title || 'Untitled'}</h1>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-silver-dim">
              {d.evidence_rating} evidence
            </span>
          </div>

          {[
            ['What it is', d.what_it_is],
            ['Why it may work', d.why_it_may_work],
            ['When to use it', d.when_to_use],
            ['How to use it', d.how_to_use],
            ['Dosage', d.dosage],
            ['Who should avoid it', d.who_should_avoid],
            ['Possible side effects', d.side_effects],
            ['Practical example', d.practical_example],
          ].map(([label, body]) =>
            body ? (
              <div key={label as string} className="mt-4">
                <h3 className="display text-[16px]">{label}</h3>
                <p className="mt-1 text-[14px] text-silver-dim">{body}</p>
              </div>
            ) : null
          )}

          {d.sources.length > 0 && (
            <div className="mt-5 border-t border-white/[.08] pt-4">
              <h3 className="display text-[16px]">Sources</h3>
              <ul className="mt-2 grid gap-1.5">
                {d.sources.filter((s) => s.organization && s.title).map((s, i) => (
                  <li key={i} className="text-[13px] text-silver-dim">
                    {s.organization}. <span className="text-silver">{s.title}</span>
                    {s.publication_year ? ` (${s.publication_year})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[22px]">
          {d.id ? 'Edit entry' : 'New Secret Sauce entry'}
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
        <Field label="Title"><input className={INPUT} value={d.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Slug" hint="Leave blank to generate from the title.">
          <input className={INPUT} value={d.slug} onChange={(e) => set('slug', e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category" hint="e.g. recovery, hydration, supplements">
            <input className={INPUT} value={d.category ?? ''} onChange={(e) => set('category', e.target.value)} />
          </Field>
          <Field label="Sort order">
            <input className={INPUT} type="number" min={0} value={String(d.sort_order)} onChange={(e) => set('sort_order', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={INPUT} value={d.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </Field>
          <Field label="Required tier">
            <select className={INPUT} value={d.required_tier} onChange={(e) => set('required_tier', e.target.value)}>
              <option value="premium">premium</option>
              <option value="basic">basic</option>
              <option value="none">none</option>
            </select>
          </Field>
        </div>

        <Field label="Evidence rating" hint="Be conservative. Rate the weight of evidence, not how interesting the idea is.">
          <div className="flex flex-wrap gap-1.5">
            {EVIDENCE.map((e) => (
              <button
                key={e.key}
                type="button"
                title={e.hint}
                onClick={() => set('evidence_rating', e.key)}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold ${
                  d.evidence_rating === e.key ? 'bg-electric text-white' : 'border border-white/[.14] text-silver-dim hover:text-white'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="The strategy">
        <Field label="What it is"><textarea className={INPUT} rows={3} value={d.what_it_is ?? ''} onChange={(e) => set('what_it_is', e.target.value)} /></Field>
        <Field label="Why it may work" hint="Use hedged language — 'may', 'research suggests'.">
          <textarea className={INPUT} rows={3} value={d.why_it_may_work ?? ''} onChange={(e) => set('why_it_may_work', e.target.value)} />
        </Field>
        <Field label="When to use it"><textarea className={INPUT} rows={2} value={d.when_to_use ?? ''} onChange={(e) => set('when_to_use', e.target.value)} /></Field>
        <Field label="How to use it"><textarea className={INPUT} rows={3} value={d.how_to_use ?? ''} onChange={(e) => set('how_to_use', e.target.value)} /></Field>
        <Field label="Practical hockey example"><textarea className={INPUT} rows={2} value={d.practical_example ?? ''} onChange={(e) => set('practical_example', e.target.value)} /></Field>
      </Section>

      {/* Dose and cautions deliberately live together. */}
      <Section title="Dosage & safety">
        <Field label="Dosage / typical range" hint="Only ranges actually reported in research. Say 'test in training first' where relevant.">
          <textarea className={INPUT} rows={2} value={d.dosage ?? ''} onChange={(e) => set('dosage', e.target.value)} />
        </Field>
        <Field label="Who should avoid it" hint="Age, medical conditions, medication interactions, anti-doping considerations.">
          <textarea className={INPUT} rows={3} value={d.who_should_avoid ?? ''} onChange={(e) => set('who_should_avoid', e.target.value)} />
        </Field>
        <Field label="Possible side effects">
          <textarea className={INPUT} rows={3} value={d.side_effects ?? ''} onChange={(e) => set('side_effects', e.target.value)} />
        </Field>
      </Section>

      <Section title={`Sources (${d.sources.length})`}>
        <p className="text-[12.5px] text-silver-dim">
          Record organization, document title and year. Leave URL and DOI blank unless you have
          personally verified them — an unverified link that looks authoritative is worse than none.
        </p>
        <div className="grid gap-2">
          {d.sources.map((s, i) => (
            <div key={i} className="rounded-lg border border-white/[.08] bg-navy-900 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={INPUT} placeholder="Organization (e.g. ACSM)" value={s.organization} onChange={(e) => updateSource(i, { organization: e.target.value })} />
                <input className={INPUT} placeholder="Document title" value={s.title} onChange={(e) => updateSource(i, { title: e.target.value })} />
                <input className={INPUT} type="number" placeholder="Year" value={String(s.publication_year ?? '')} onChange={(e) => updateSource(i, { publication_year: e.target.value })} />
                <input className={INPUT} placeholder="Type (position stand, review…)" value={s.source_type ?? ''} onChange={(e) => updateSource(i, { source_type: e.target.value })} />
                <input className={INPUT} placeholder="URL (optional, verified only)" value={s.url ?? ''} onChange={(e) => updateSource(i, { url: e.target.value })} />
                <input className={INPUT} placeholder="DOI (optional, verified only)" value={s.doi ?? ''} onChange={(e) => updateSource(i, { doi: e.target.value })} />
              </div>
              <div className="mt-2">
                <Btn onClick={() => set('sources', d.sources.filter((_, idx) => idx !== i))} label="Remove source" small danger />
              </div>
            </div>
          ))}
        </div>
        <Btn
          onClick={() =>
            set('sources', [
              ...d.sources,
              { organization: '', title: '', publication_year: '', source_type: '', url: '', doi: '' },
            ])
          }
          label="+ Add source"
        />
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
