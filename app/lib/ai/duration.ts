/* ==========================================================================
   SERVER-SIDE VIDEO DURATION VERIFICATION  —  SERVER ONLY

   WHY THIS EXISTS
   The upload route previously took `durationSec` from the request body and
   wrote it straight to the database. That is a client-supplied number: anyone
   could upload a 30-second clip, POST `durationSec: 3`, and the server would
   believe it. The 5-second rule has to be decided from the FILE, not from what
   the caller says about the file.

   WHY NOT ffprobe
   ffmpeg/ffprobe are not present on Vercel's Node runtime, and shipping a
   binary or a WASM build for one number is disproportionate. Instead this
   reads the duration out of the container header, which is where the encoder
   already wrote it.

     MP4 / MOV (ISO-BMFF)  `moov` -> `mvhd` : timescale + duration
     WebM / Matroska       Segment -> Info  : TimecodeScale + Duration

   Both are read from bytes fetched out of Supabase Storage server-side, so the
   browser is never involved and cannot influence the answer.

   FAIL CLOSED
   If the duration cannot be established, the analysis is REFUSED rather than
   waved through. An unreadable header is exactly what a crafted file would
   present, and letting it past would defeat the check.
   ========================================================================== */

if (typeof window !== 'undefined') {
  throw new Error('lib/ai/duration.ts is server-only.');
}

/** Longest clip the AI Shot Analysis will accept, in seconds. */
export const MAX_ANALYSIS_SECONDS = 5;

/**
 * Small tolerance for encoder rounding. A phone recording "5 seconds" often
 * lands at 5.02s; rejecting that would be maddening and buys no safety. A
 * 5.5s clip is still refused.
 */
export const DURATION_TOLERANCE_SECONDS = 0.25;

export type DurationResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: 'too_long'; seconds: number }
  | { ok: false; reason: 'unreadable' };

/* -------------------------------------------------------------------------- */
/* MP4 / MOV — ISO base media file format                                     */
/* -------------------------------------------------------------------------- */

/**
 * Walks the atom tree looking for `mvhd`.
 *
 * Atom layout: [4 bytes size][4 bytes type][payload]. `moov` is a container,
 * so we descend into it; everything else is skipped by its declared size.
 * Size 1 means a 64-bit size follows the type; size 0 means "to end of file".
 */
function findMvhdDuration(buf: Uint8Array): number | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const walk = (start: number, end: number, depth: number): number | null => {
    let offset = start;
    // Bail out on absurd nesting rather than recursing on malformed input.
    if (depth > 8) return null;

    while (offset + 8 <= end) {
      let size = view.getUint32(offset);
      const type = String.fromCharCode(
        buf[offset + 4], buf[offset + 5], buf[offset + 6], buf[offset + 7]
      );
      let headerSize = 8;

      if (size === 1) {
        if (offset + 16 > end) return null;
        // 64-bit size. Reading the low 32 bits is enough: no sane header sits
        // beyond 4 GB, and anything claiming to is rejected below anyway.
        size = Number(view.getBigUint64(offset + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }

      if (size < headerSize) return null; // malformed: would not advance

      if (type === 'mvhd') {
        const p = offset + headerSize;
        if (p + 4 > end) return null;
        const version = buf[p];

        if (version === 1) {
          // v1: 8-byte created/modified, then 4-byte timescale, 8-byte duration
          if (p + 28 > end) return null;
          const timescale = view.getUint32(p + 20);
          const duration = Number(view.getBigUint64(p + 24));
          return timescale > 0 ? duration / timescale : null;
        }
        // v0: 4-byte created/modified, then 4-byte timescale, 4-byte duration
        if (p + 20 > end) return null;
        const timescale = view.getUint32(p + 12);
        const duration = view.getUint32(p + 16);
        return timescale > 0 ? duration / timescale : null;
      }

      // `moov` holds `mvhd`; descend. Everything else is skipped wholesale.
      if (type === 'moov') {
        const found = walk(offset + headerSize, Math.min(offset + size, end), depth + 1);
        if (found !== null) return found;
      }

      offset += size;
    }
    return null;
  };

  return walk(0, buf.byteLength, 0);
}

/* -------------------------------------------------------------------------- */
/* WebM / Matroska — EBML                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Matroska stores Duration as a float in Segment>Info, scaled by TimecodeScale
 * (nanoseconds, default 1,000,000 = 1 ms).
 *
 * Rather than implement a full EBML parser for one field, this scans for the
 * two known element IDs. Adequate for a duration gate, and a file that does
 * not yield one is refused rather than assumed short.
 */
function findWebmDuration(buf: Uint8Array): number | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let timecodeScale = 1_000_000; // default per spec
  let duration: number | null = null;

  for (let i = 0; i + 12 < buf.byteLength; i++) {
    // TimecodeScale: 0x2AD7B1
    if (buf[i] === 0x2a && buf[i + 1] === 0xd7 && buf[i + 2] === 0xb1) {
      const len = buf[i + 3] & 0x7f;
      if (len >= 1 && len <= 8 && i + 4 + len <= buf.byteLength) {
        let v = 0;
        for (let k = 0; k < len; k++) v = v * 256 + buf[i + 4 + k];
        if (v > 0) timecodeScale = v;
      }
    }
    // Duration: 0x4489, stored as a 4- or 8-byte float
    if (buf[i] === 0x44 && buf[i + 1] === 0x89) {
      const len = buf[i + 2] & 0x7f;
      if (len === 4 && i + 3 + 4 <= buf.byteLength) duration = view.getFloat32(i + 3);
      else if (len === 8 && i + 3 + 8 <= buf.byteLength) duration = view.getFloat64(i + 3);
    }
  }

  if (duration === null || !Number.isFinite(duration) || duration <= 0) return null;
  return (duration * timecodeScale) / 1_000_000_000;
}

/* -------------------------------------------------------------------------- */

/** Parses duration from raw container bytes. Null when it cannot be read. */
export function durationFromBytes(bytes: Uint8Array): number | null {
  // EBML magic (0x1A45DFA3) => WebM/Matroska.
  const isWebm =
    bytes.length > 4 &&
    bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;

  const seconds = isWebm ? findWebmDuration(bytes) : findMvhdDuration(bytes);
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

type StorageLike = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};

/**
 * THE AUTHORITATIVE CHECK.
 *
 * Downloads the stored object server-side and reads its real duration. The
 * caller's claimed duration is never consulted.
 *
 * `moov` can sit at the head (web-optimized) or the tail (straight off a phone
 * camera), so the whole object is read. That is affordable precisely because
 * the file is supposed to be a ~5 second clip; anything genuinely huge is
 * already refused by the size limit before reaching here.
 */
export async function verifyStoredDuration(
  supabase: StorageLike,
  bucket: string,
  path: string
): Promise<DurationResult> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      console.error('[duration] could not download for verification:', error);
      return { ok: false, reason: 'unreadable' };
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const seconds = durationFromBytes(bytes);

    if (seconds === null) {
      // Unparseable container. Fail CLOSED — this is what a crafted or
      // corrupt file looks like, and waving it through would defeat the gate.
      return { ok: false, reason: 'unreadable' };
    }

    if (seconds > MAX_ANALYSIS_SECONDS + DURATION_TOLERANCE_SECONDS) {
      return { ok: false, reason: 'too_long', seconds };
    }

    return { ok: true, seconds };
  } catch (err) {
    console.error('[duration] verification threw:', (err as Error).message);
    return { ok: false, reason: 'unreadable' };
  }
}

/** Customer-safe message. Never leaks parser or storage internals. */
export function durationErrorMessage(result: Exclude<DurationResult, { ok: true }>): string {
  if (result.reason === 'too_long') {
    return `Your shot video must be ${MAX_ANALYSIS_SECONDS} seconds or shorter — this one is ${result.seconds.toFixed(1)} seconds. Please upload a shorter clip focused on the shot itself.`;
  }
  return `We could not read that video. Please upload an MP4, MOV or WEBM clip of ${MAX_ANALYSIS_SECONDS} seconds or less.`;
}
