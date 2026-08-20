'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Pillar, PlayLevel, Position } from '@/lib/types';

interface Initial {
  firstName: string;
  birthYear: number | null;
  level: PlayLevel;
  position: Position;
  shoots: 'left' | 'right';
  stickFlex: number | null;
  focusPillars: Pillar[];
  trainingDaysGoal: number;
}

const LEVELS: { value: PlayLevel; label: string }[] = [
  { value: 'house', label: 'House / Rec' },
  { value: 'a', label: 'A' },
  { value: 'aa', label: 'AA' },
  { value: 'aaa', label: 'AAA' },
  { value: 'prep', label: 'Prep' },
  { value: 'junior', label: 'Junior' },
  { value: 'college', label: 'College' },
];

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'defense', label: 'Defence' },
  { value: 'goalie', label: 'Goaltender' },
];

/**
 * Same fields, same table, same server-side validation as onboarding — see
 * lib/player-profile.ts. This form only ever PATCHes /api/profile, which
 * requires an authenticated session and writes exclusively to the caller's
 * own `players` row ("own players" RLS, migration 0001). Nothing here
 * decides authorization; the server does.
 */
export default function EditProfileForm({
  initial,
  pillars,
}: {
  initial: Initial;
  pillars: { key: Pillar; label: string; blurb: string }[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [birthYear, setBirthYear] = useState(initial.birthYear?.toString() ?? '');
  const [level, setLevel] = useState<PlayLevel>(initial.level);
  const [position, setPosition] = useState<Position>(initial.position);
  const [shoots, setShoots] = useState<'left' | 'right'>(initial.shoots);
  const [stickFlex, setStickFlex] = useState(initial.stickFlex?.toString() ?? '');
  const [focusPillars, setFocusPillars] = useState<Pillar[]>(initial.focusPillars);
  const [trainingDaysGoal, setTrainingDaysGoal] = useState(initial.trainingDaysGoal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function togglePillar(key: Pillar) {
    setSaved(false);
    setFocusPillars((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!firstName.trim()) return setError('Enter a first name.');

    setBusy(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName,
          birthYear: birthYear ? Number(birthYear) : null,
          level,
          position,
          shoots,
          stickFlex: stickFlex ? Number(stickFlex) : null,
          focusPillars,
          trainingDaysGoal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      setSaved(true);
      // Server components (the profile hero above, the dashboard, the
      // sidebar) re-fetch on navigation — refresh() re-renders this page's
      // server tree in place so the saved values show immediately.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">First name</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Birth year</span>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            disabled={busy}
            placeholder="2011"
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Level</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as PlayLevel)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Position</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Shoots</span>
          <select
            value={shoots}
            onChange={(e) => setShoots(e.target.value as 'left' | 'right')}
            disabled={busy}
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-white">Stick flex</span>
          <input
            type="number"
            value={stickFlex}
            onChange={(e) => setStickFlex(e.target.value)}
            disabled={busy}
            placeholder="65"
            className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
          />
        </label>
      </div>

      <div>
        <span className="mb-2 block text-[13px] font-semibold text-white">Development pillars</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {pillars.map((p) => (
            <label
              key={p.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.1] bg-ink px-4 py-3 transition-colors hover:border-white/25"
            >
              <input
                type="checkbox"
                checked={focusPillars.includes(p.key)}
                onChange={() => togglePillar(p.key)}
                disabled={busy}
                className="mt-1 h-4 w-4 shrink-0 accent-[#0A84FF]"
              />
              <span>
                <span className="block text-[13.5px] font-semibold text-white">{p.label}</span>
                <span className="block text-[12px] text-silver-dim">{p.blurb}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-semibold text-white">Training days per week</span>
        <select
          value={trainingDaysGoal}
          onChange={(e) => setTrainingDaysGoal(Number(e.target.value))}
          disabled={busy}
          className="rounded-lg border border-white/[.14] bg-ink px-3 py-2.5 text-[14px] text-white disabled:opacity-50"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>{n} days per week</option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[14px] text-white">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] px-4 py-3 text-[14px] text-white">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold text-white transition-all hover:bg-electric-glow disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
