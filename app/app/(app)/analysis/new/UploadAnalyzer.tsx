'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractFrames, readVideoDuration, type ExtractedFrame } from '@/lib/ai/frames';
import { Card } from '@/components/ui';

/* ==========================================================================
   UPLOAD → EXTRACT → ANALYSE

   The full sequence, client side:
     1. Validate the file locally (fast failure, no wasted upload).
     2. Ask the server for a signed upload URL. The server creates the analysis
        row and derives the storage path from the session — the path is never
        chosen here.
     3. PUT the video straight to Supabase Storage. It does not pass through
        the Next.js server, so large clips do not hit body-size limits.
     4. Extract frames locally via canvas, so the member sees exactly what will
        be graded before anything is sent.
     5. POST the frames to the server, which calls the vision model. API keys
        stay server-side throughout.

   No step here can produce a score. The report comes back from the server or
   the analysis is marked for coach review.
   ========================================================================== */

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_BYTES = 200 * 1024 * 1024;

const SHOT_TYPES = [
  { value: 'wrist', label: 'Wrist shot' },
  { value: 'snap', label: 'Snap shot' },
  { value: 'slap', label: 'Slap shot' },
  { value: 'backhand', label: 'Backhand' },
  { value: 'one_timer', label: 'One-timer' },
];

const ANGLES = [
  { value: 'side', label: 'Side on', hint: 'Best angle. Shows load, transfer and release.' },
  { value: 'front', label: 'Front on', hint: 'Good for hips, shoulders and hand separation.' },
  { value: 'rear', label: 'From behind', hint: 'Limited — shoulder rotation only.' },
];

type Phase = 'idle' | 'uploading' | 'extracting' | 'analysing' | 'done' | 'error';

const PHASE_COPY: Record<Exclude<Phase, 'idle' | 'done' | 'error'>, string> = {
  uploading: 'Uploading your clip securely…',
  extracting: 'Finding the release and pulling frames…',
  analysing: 'Grading ten mechanics categories…',
};

function validateFile(file: File): string | null {
  const okType = ACCEPTED.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);
  if (!okType) return 'Use an MP4, MOV or WEBM file.';
  if (file.size > MAX_BYTES) return 'That file is over 200 MB. Trim the clip and try again.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export default function UploadAnalyzer() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shotType, setShotType] = useState('wrist');
  const [angle, setAngle] = useState('side');
  const [notes, setNotes] = useState('');

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Object URLs are finite resources; release them when this unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [previewUrl, frames]);

  const pickFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      const problem = validateFile(f);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      setNotice(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setFrames([]);
      setPhase('idle');
    },
    [previewUrl]
  );

  async function run() {
    if (!file) return;
    setError(null);
    setNotice(null);

    try {
      // ---- 1. reserve the analysis + get a signed upload URL ------------
      setPhase('uploading');
      setProgress(5);

      const durationSec = await readVideoDuration(file);

      const initRes = await fetch('/api/analysis/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          shotType,
          angle,
          playerNotes: notes,
          durationSec,
        }),
      });

      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? 'Could not start the upload.');

      // ---- 2. PUT the video straight to storage -------------------------
      setProgress(15);
      const put = await fetch(init.signedUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'video/mp4' },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`The video upload failed (${put.status}). Check your connection and retry.`);
      }
      setProgress(45);

      // ---- 3. extract frames locally ------------------------------------
      setPhase('extracting');
      const extracted = await extractFrames(file, {
        count: 10,
        onProgress: (done, total) => setProgress(45 + Math.round((done / total) * 25)),
      });
      setFrames(extracted);
      setProgress(72);

      // ---- 4. analyse ---------------------------------------------------
      setPhase('analysing');
      const runRes = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          analysisId: init.analysisId,
          frames: extracted.map((f) => ({
            base64: f.base64,
            mediaType: f.mediaType,
            timestampMs: f.timestampMs,
          })),
        }),
      });
      setProgress(96);

      const result = await runRes.json();

      // 202 = accepted but routed to a human. Not a failure, and the video is kept.
      if (runRes.status === 202 || result.status === 'in_review') {
        setPhase('done');
        setProgress(100);
        setNotice(
          result.message ??
            result.error ??
            'Your clip has been sent to a coach for manual review.'
        );
        setTimeout(() => router.push(`/analysis/${init.analysisId}`), 1600);
        return;
      }

      if (!runRes.ok) throw new Error(result.error ?? 'The analysis failed.');

      setPhase('done');
      setProgress(100);
      router.push(`/analysis/${init.analysisId}`);
    } catch (err) {
      setPhase('error');
      setError((err as Error).message);
    }
  }

  const busy = phase === 'uploading' || phase === 'extracting' || phase === 'analysing';

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      {/* ------------------------------------------------ upload + settings */}
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="display text-[20px]">1 · Your clip</h2>

          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className="mt-4 cursor-pointer rounded-xl border-2 border-dashed border-white/[.14] bg-navy-900/40 px-6 py-12 text-center transition-colors hover:border-electric/50 hover:bg-electric/[.04]"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-electric shadow-[0_10px_36px_rgba(10,132,255,.45)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
              <p className="mt-4 font-semibold text-white">Drop your video here</p>
              <p className="mt-1 text-[13.5px] text-silver-dim">MP4, MOV or WEBM · up to 200 MB</p>
            </div>
          ) : (
            <div className="mt-4">
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl border border-white/[.08] bg-black"
                />
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-[13.5px] text-silver-dim">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {!busy && (
                  <button
                    onClick={() => {
                      setFile(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                      setFrames([]);
                      setPhase('idle');
                    }}
                    className="text-[13px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
                  >
                    Choose a different clip
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </Card>

        <Card className="p-6">
          <h2 className="display text-[20px]">2 · What are we looking at?</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="shotType" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Shot type
              </label>
              <select
                id="shotType"
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                disabled={busy}
                className="w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white"
              >
                {SHOT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="angle" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Camera angle
              </label>
              <select
                id="angle"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                disabled={busy}
                className="w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white"
              >
                {ANGLES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-2 text-[13px] text-silver-dim">
            {ANGLES.find((a) => a.value === angle)?.hint}
          </p>

          <div className="mt-4">
            <label htmlFor="notes" className="mb-2 block text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
              Anything you want looked at? (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
              disabled={busy}
              rows={3}
              placeholder="e.g. My shot feels slow off the toe and I'm not sure why."
              className="w-full rounded-[10px] border border-white/[.14] bg-ink px-4 py-3 text-[15px] text-white placeholder:text-silver-dim/60"
            />
          </div>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-400/[.08] px-5 py-4">
            <p className="text-[14.5px] font-semibold text-red-300">{error}</p>
            <p className="mt-1 text-[13.5px] text-silver-dim">
              Your clip has not been lost — if the upload got far enough it will appear in your
              history and can be sent to a coach.
            </p>
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-amber/40 bg-amber/[.08] px-5 py-4">
            <p className="text-[14.5px] font-semibold text-amber">{notice}</p>
          </div>
        )}

        {busy ? (
          <Card className="p-6">
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="font-semibold text-white">
                {PHASE_COPY[phase as keyof typeof PHASE_COPY]}
              </span>
              <span className="tabular-nums text-silver-dim">{progress}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy-700">
              <div
                className="h-full rounded-full bg-electric transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-[13px] text-silver-dim">
              Keep this tab open. Analysis usually takes 20–60 seconds.
            </p>
          </Card>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={!file}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-electric px-8 py-4 text-[15px] font-bold tracking-wide text-white shadow-[0_8px_30px_rgba(10,132,255,.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-40"
          >
            {phase === 'error' ? 'Try Again' : 'Analyse This Shot'}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------- side panel */}
      <div className="grid content-start gap-6">
        <Card className="p-6">
          <h3 className="display text-[18px]">Filming for a real read</h3>
          <ul className="mt-4 grid gap-3 text-[14px] text-silver-dim">
            <li>Side on, about ten feet away, whole body in frame.</li>
            <li>Five shots of the same type in one clip.</li>
            <li>Good light. Phone held steady, landscape.</li>
            <li>Include the setup, not just the release.</li>
          </ul>
          <p className="mt-4 text-[13px] text-silver-dim">
            Distant rink-camera footage will not support a mechanics breakdown — at that range a
            player is about forty pixels tall. You will get a lot of{' '}
            <span className="text-silver">insufficient footage</span> back, which is the honest
            answer rather than a guess.
          </p>
        </Card>

        {frames.length > 0 && (
          <Card className="p-6">
            <h3 className="display text-[18px]">Frames being graded</h3>
            <p className="mt-2 text-[13px] text-silver-dim">
              Pulled from around the highest-motion moment — the release.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {frames.map((f, i) => (
                <div key={i} className="relative overflow-hidden rounded-md border border-white/[.08]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.previewUrl} alt={`Frame ${i + 1}`} className="w-full" />
                  <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-silver">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="display text-[18px]">What you get back</h3>
          <p className="mt-3 text-[14px] text-silver-dim">
            Ten categories scored 1–10 where the footage supports it, each with what was actually
            seen, a confidence level, and whether it was observed or inferred. Anything unclear is
            returned as <span className="text-silver">insufficient footage</span> — never a made-up
            number.
          </p>
          <p className="mt-3 text-[13px] text-silver-dim">
            If the read comes back low-confidence, you can send the same clip to a coach.
          </p>
        </Card>
      </div>
    </div>
  );
}
