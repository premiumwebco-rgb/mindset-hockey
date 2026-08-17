'use client';

import { useRef, useState, type RefObject } from 'react';
import { RUBRIC } from '@/lib/types';

/**
 * Side-by-side comparison player.
 *
 * The critical UX detail is the sync offset: a comparison is meaningless
 * unless both clips are aligned to the moment of release. One transport
 * controls both videos, frame-steps at 1/30s, and plays at 0.1x-1x.
 *
 * Pass real `srcLeft` / `srcRight` URLs (signed Mux playback) to use it.
 * With no sources it renders the full control surface over placeholders so
 * the interaction can be reviewed before any video exists.
 */
export default function VideoCompare({
  srcLeft,
  srcRight,
  labelLeft = 'Your shot',
  labelRight = 'Pro clip',
  initialOffsetMs = 0,
}: {
  srcLeft?: string;
  srcRight?: string;
  labelLeft?: string;
  labelRight?: string;
  initialOffsetMs?: number;
}) {
  const left = useRef<HTMLVideoElement>(null);
  const right = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.25);
  const [offsetMs, setOffsetMs] = useState(initialOffsetMs);
  const [overlays, setOverlays] = useState<number[]>([1, 2]);

  const FRAME = 1 / 30;

  function apply(fn: (v: HTMLVideoElement, isRight: boolean) => void) {
    if (left.current) fn(left.current, false);
    if (right.current) fn(right.current, true);
  }

  function togglePlay() {
    const next = !playing;
    setPlaying(next);
    apply((v) => {
      v.playbackRate = rate;
      if (next) void v.play();
      else v.pause();
    });
  }

  function step(frames: number) {
    setPlaying(false);
    apply((v, isRight) => {
      v.pause();
      const base = v.currentTime + frames * FRAME;
      v.currentTime = Math.max(0, base + (isRight ? offsetMs / 1000 : 0));
    });
  }

  function changeRate(r: number) {
    setRate(r);
    apply((v) => {
      v.playbackRate = r;
    });
  }

  function resync(ms: number) {
    setOffsetMs(ms);
    if (right.current && left.current) {
      right.current.currentTime = Math.max(0, left.current.currentTime + ms / 1000);
    }
  }

  function toggleOverlay(id: number) {
    setOverlays((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const pane = (
    src: string | undefined,
    ref: RefObject<HTMLVideoElement | null>,
    label: string
  ) => (
    <div className="relative overflow-hidden rounded-xl border border-white/[.08] bg-navy-900">
      <span className="absolute left-3 top-3 z-10 rounded-md border border-white/[.14] bg-ink/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-white">
        {label}
      </span>

      {src ? (
        <video ref={ref} src={src} className="aspect-video w-full" playsInline muted />
      ) : (
        <div className="grid aspect-video w-full place-items-center">
          <p className="text-[11px] uppercase tracking-[.2em] text-silver-dim">{label} — no clip loaded</p>
        </div>
      )}

      {/* rubric overlay guides */}
      <div className="pointer-events-none absolute inset-0">
        {overlays.includes(1) && (
          <div className="absolute bottom-[18%] left-0 right-0 border-t border-dashed border-electric/70">
            <span className="absolute -top-5 left-3 text-[9.5px] font-bold uppercase tracking-[.14em] text-electric-glow">
              Weight transfer
            </span>
          </div>
        )}
        {overlays.includes(2) && (
          <div className="absolute bottom-0 top-0 left-[46%] border-l border-dashed border-electric/70">
            <span className="absolute left-2 top-3 text-[9.5px] font-bold uppercase tracking-[.14em] text-electric-glow">
              Puck position
            </span>
          </div>
        )}
        {overlays.includes(6) && (
          <div className="absolute bottom-0 top-0 left-[50%] border-l border-dashed border-white/40">
            <span className="absolute left-2 bottom-3 text-[9.5px] font-bold uppercase tracking-[.14em] text-silver">
              Centre of mass
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {pane(srcLeft, left, labelLeft)}
        {pane(srcRight, right, labelRight)}
      </div>

      {/* transport */}
      <div className="mt-4 rounded-xl border border-white/[.08] bg-navy-900 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => step(-5)}
            className="min-h-[44px] rounded-lg border border-white/[.14] px-3 py-2 text-[13px] font-semibold hover:border-electric hover:text-white"
          >
            ⏪ 5f
          </button>
          <button
            onClick={() => step(-1)}
            className="min-h-[44px] rounded-lg border border-white/[.14] px-3 py-2 text-[13px] font-semibold hover:border-electric hover:text-white"
          >
            ◀ 1f
          </button>
          <button
            onClick={togglePlay}
            className="min-h-[44px] rounded-lg bg-electric px-5 py-2 text-[13px] font-bold text-white hover:bg-electric-glow"
          >
            {playing ? 'Pause' : 'Play both'}
          </button>
          <button
            onClick={() => step(1)}
            className="min-h-[44px] rounded-lg border border-white/[.14] px-3 py-2 text-[13px] font-semibold hover:border-electric hover:text-white"
          >
            1f ▶
          </button>
          <button
            onClick={() => step(5)}
            className="min-h-[44px] rounded-lg border border-white/[.14] px-3 py-2 text-[13px] font-semibold hover:border-electric hover:text-white"
          >
            5f ⏩
          </button>

          <span className="ml-2 text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
            Speed
          </span>
          {[0.1, 0.25, 0.5, 1].map((r) => (
            <button
              key={r}
              onClick={() => changeRate(r)}
              className={`min-h-[44px] rounded-lg px-3 py-2 text-[13px] font-semibold ${
                rate === r ? 'bg-electric text-white' : 'border border-white/[.14] text-silver-dim hover:text-white'
              }`}
            >
              {r}×
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="font-bold uppercase tracking-[.14em] text-silver-dim">
              Release sync offset
            </span>
            <span className="tabular-nums text-silver">
              {offsetMs > 0 ? '+' : ''}
              {(offsetMs / 1000).toFixed(2)}s
            </span>
          </div>
          <input
            type="range"
            min={-2000}
            max={2000}
            step={33}
            value={offsetMs}
            onChange={(e) => resync(Number(e.target.value))}
            className="!p-0 accent-[#0A84FF]"
          />
          <p className="text-[11.5px] text-silver-dim">
            Slide until both clips hit the moment of release at the same time. A comparison is
            useless until the release frames line up.
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
            Overlays
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RUBRIC.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleOverlay(p.id)}
                className={`min-h-[40px] rounded-md px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                  overlays.includes(p.id)
                    ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                    : 'bg-white/[.05] text-silver-dim hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
