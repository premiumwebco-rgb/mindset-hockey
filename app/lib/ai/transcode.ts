'use client';

/* ==========================================================================
   CLIENT-SIDE VIDEO COMPATIBILITY

   WHY THIS EXISTS
   Root cause of "video does not load on mobile": AI Shot Analysis clips are
   stored byte-for-byte as uploaded. An iPhone Camera app records H.265/HEVC
   inside a QuickTime (.mov) container by default. Safari (macOS + iOS) plays
   that natively; Chromium — which is what almost every non-Apple mobile
   browser uses, Android Chrome above all — cannot decode the QuickTime
   container at all, independent of the codec inside it. The clip silently
   fails to play with no error shown to the viewer.

   WHY THIS RUNS IN THE BROWSER, NOT ON THE SERVER
   This app is deployed on Vercel serverless functions: no ffmpeg binary is
   bundled, execution time is capped (10-60s depending on plan), and memory is
   limited. Running a video encoder inside a normal request is not something
   this platform can do safely. AI Shot Analysis clips are capped at 5 seconds
   (MAX_ANALYSIS_SECONDS in lib/ai/duration.ts), which makes a browser-side
   transcode fast and light — a 5-second clip is a trivial amount of work for
   ffmpeg.wasm, unlike a full-length training video would be.

   HOW
   ffmpeg.wasm is loaded from a CDN at runtime, on demand, only on this upload
   page and only when the picked file is not already broadly compatible.
   Nothing is added to the app's own JS bundle or to package.json — this
   sidesteps the question of whether the native ffmpeg binary is available in
   this deployment entirely, because no native binary is ever used; it is pure
   WebAssembly running in the visitor's own browser.

   The SINGLE-THREADED ffmpeg core is used deliberately. The multi-threaded
   build needs SharedArrayBuffer, which needs Cross-Origin-Opener-Policy /
   Cross-Origin-Embedder-Policy response headers that nothing in this app
   currently sets — adding those globally would be a much bigger, riskier
   change than this feature justifies. Single-threaded is slower but needs no
   header changes anywhere, so this stays fully self-contained on this page.

   WHAT HAPPENS ON FAILURE
   If the CDN is unreachable, the device is too constrained, or the transcode
   throws for any reason, this fails soft: the ORIGINAL file is uploaded
   exactly as it would have been before this feature existed. A visitor is
   never blocked from uploading because their browser could not transcode.
   ========================================================================== */

/** Types that already play everywhere. Never transcoded, even if selected. */
const BROADLY_COMPATIBLE_TYPES = new Set(['video/mp4', 'video/webm']);

/**
 * True when a file is NOT already in a broadly-compatible container.
 * `video/quicktime` (.mov) is the common case; an empty/unrecognised type from
 * an unusual mobile file picker is treated the same way, since there is
 * nothing to lose by attempting a transcode on it.
 */
export function needsTranscode(file: File): boolean {
  if (BROADLY_COMPATIBLE_TYPES.has(file.type)) return false;
  if (/\.(mp4|webm)$/i.test(file.name) && file.type === '') return false;
  return true;
}

const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const FFMPEG_ESM = 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10';
const UTIL_ESM = 'https://esm.sh/@ffmpeg/util@0.12.1';

export interface TranscodeResult {
  file: File;
  transcoded: boolean;
}

/**
 * Converts a video to H.264/AAC MP4 in the browser. Returns the ORIGINAL file
 * unchanged, with `transcoded: false`, if the file is already compatible or if
 * anything about the conversion fails — this function is designed to never be
 * the reason an upload does not happen.
 */
export async function ensurePlayableMp4(
  file: File,
  onProgress?: (pct: number) => void
): Promise<TranscodeResult> {
  if (!needsTranscode(file)) return { file, transcoded: false };

  try {
    // Loaded from a CDN at call time — not bundled, not a package.json
    // dependency. Webpack cannot statically resolve a template-literal-free
    // absolute URL passed to import(), so this stays a genuine runtime fetch.
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import(/* webpackIgnore: true */ FFMPEG_ESM),
      import(/* webpackIgnore: true */ UTIL_ESM),
    ]);

    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      });
    }

    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] ?? '.mov');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // -preset ultrafast: these clips are capped at 5 seconds, so encode speed
    // matters far more than file size here. -movflags +faststart moves the
    // moov atom to the front, which is what lib/ai/duration.ts's server-side
    // parser (and every browser) expects to find quickly.
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      'output.mp4',
    ]);

    const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    const bytes = new Uint8Array(data);
    const newName = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    const out = new File([bytes], newName, { type: 'video/mp4' });

    return { file: out, transcoded: true };
  } catch (err) {
    console.warn('[transcode] falling back to original file:', (err as Error).message);
    return { file, transcoded: false };
  }
}
