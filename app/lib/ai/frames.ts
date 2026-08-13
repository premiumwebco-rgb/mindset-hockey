'use client';

/* ==========================================================================
   FRAME EXTRACTION  —  BROWSER ONLY

   Runs in the browser with <video> + <canvas>. That choice matters:
     - no ffmpeg on the server, so this deploys to serverless without a binary
     - the member sees exactly which frames will be graded before anything runs
     - the server never has to decode a 200 MB video

   The full video is still uploaded and stored (see the upload flow) — frames
   are what gets sent to the model, but the source clip is kept so a coach can
   review it and so the member can play it back later.

   Sampling strategy: probe the clip cheaply for the highest-motion window,
   which in a shooting clip is essentially always the release, then sample
   evenly across a window centred on it so setup, load, release and
   follow-through are all represented.
   ========================================================================== */

export interface ExtractedFrame {
  /** Base64 JPEG, no data: prefix. */
  base64: string;
  mediaType: 'image/jpeg';
  timestampMs: number;
  /** Object URL for the preview thumbnails. Revoke when finished. */
  previewUrl: string;
}

export interface ExtractOptions {
  /** How many frames to grade. 8-12 is the sweet spot for cost vs coverage. */
  count?: number;
  /** Longest edge in pixels. Larger costs more tokens for little accuracy gain. */
  maxEdge?: number;
  quality?: number;
  focusOnMotion?: boolean;
  onProgress?: (done: number, total: number) => void;
}

const DEFAULTS: Required<Omit<ExtractOptions, 'onProgress'>> = {
  count: 10,
  maxEdge: 1024,
  quality: 0.82,
  focusOnMotion: true,
};

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () =>
      reject(
        new Error(
          'The browser could not read that video. Try re-saving it as MP4 and uploading again.'
        )
      );
  });
}

function seek(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      // One rAF so the frame is actually painted before we read it back.
      requestAnimationFrame(() => resolve());
    };
    video.addEventListener('seeked', onSeeked);
    video.onerror = () => reject(new Error('Video seek failed.'));
    video.currentTime = Math.min(timeSec, Math.max(0, video.duration - 0.05));
  });
}

function drawToCanvas(
  video: HTMLVideoElement,
  maxEdge: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** Mean absolute greyscale difference between two downsamples, 0-255. */
function frameDelta(a: ImageData, b: ImageData): number {
  let sum = 0;
  let n = 0;
  const step = 4 * 8; // every 8th pixel is plenty for motion detection
  for (let i = 0; i < a.data.length; i += step) {
    const ga = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3;
    const gb = (b.data[i] + b.data[i + 1] + b.data[i + 2]) / 3;
    sum += Math.abs(ga - gb);
    n++;
  }
  return n ? sum / n : 0;
}

/** Finds the window containing the most motion — the release. */
async function findMotionWindow(video: HTMLVideoElement): Promise<[number, number]> {
  const duration = video.duration;
  const probes = Math.min(24, Math.max(8, Math.floor(duration * 4)));
  const times: number[] = [];
  const deltas: number[] = [];

  let prev: ImageData | null = null;
  for (let i = 0; i < probes; i++) {
    const t = (duration * i) / (probes - 1);
    await seek(video, t);
    const { canvas, ctx } = drawToCanvas(video, 240); // tiny — motion only
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (prev) {
      times.push(t);
      deltas.push(frameDelta(prev, data));
    }
    prev = data;
  }

  if (!deltas.length) return [0, duration];

  let peakIdx = 0;
  for (let i = 1; i < deltas.length; i++) if (deltas[i] > deltas[peakIdx]) peakIdx = i;

  // Weighted slightly earlier than the peak so setup and load are captured,
  // not just the release and follow-through.
  const peak = times[peakIdx];
  const before = Math.min(1.2, duration / 3);
  const after = Math.min(0.8, duration / 4);
  return [Math.max(0, peak - before), Math.min(duration, peak + after)];
}

export async function extractFrames(
  file: File,
  options: ExtractOptions = {}
): Promise<ExtractedFrame[]> {
  const opts = { ...DEFAULTS, ...options };
  const video = await loadVideo(file);

  try {
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('That video has no readable duration.');
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('That file has no video track the browser can read.');
    }

    let start = 0;
    let end = video.duration;
    if (opts.focusOnMotion && video.duration > 2) {
      [start, end] = await findMotionWindow(video);
    }

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < opts.count; i++) {
      const t = start + ((end - start) * i) / Math.max(1, opts.count - 1);
      await seek(video, t);
      const { canvas } = drawToCanvas(video, opts.maxEdge);

      const dataUrl = canvas.toDataURL('image/jpeg', opts.quality);
      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), 'image/jpeg', opts.quality)
      );

      frames.push({
        base64: dataUrl.split(',')[1],
        mediaType: 'image/jpeg',
        timestampMs: Math.round(t * 1000),
        previewUrl: URL.createObjectURL(blob),
      });

      opts.onProgress?.(i + 1, opts.count);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(video.src);
  }
}

/** Reads duration without extracting anything, for the metadata record. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(video.src);
      resolve(d);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
  });
}
