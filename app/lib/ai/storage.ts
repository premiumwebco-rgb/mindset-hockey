/* ==========================================================================
   VIDEO STORAGE  —  SERVER ONLY

   Fixes the gap the previous implementation left open: the source video was
   never stored, only frames were sent to the model and `video_path` held a
   bare filename. Nothing could be replayed, re-analyzed, or handed to a coach.

   THE OWNERSHIP MODEL
   Every object lives at:   <user-uuid>/<analysis-id>/<filename>
   The first path segment is the owner. The storage RLS policy compares it to
   auth.uid(), which is what actually stops member A reading member B's video —
   not anything in the application layer. Buckets are private; playback uses a
   short-lived signed URL minted here on the server.

   Paths are never accepted from the client. They are derived from the session
   user id and the analysis id, so a caller cannot craft a path pointing into
   somebody else's folder.
   ========================================================================== */

import { VIDEO_BUCKET, FRAME_BUCKET, SIGNED_URL_TTL } from './config';

if (typeof window !== 'undefined') {
  throw new Error('lib/ai/storage.ts is server-only and was imported from client code.');
}

type SupabaseLike = Awaited<ReturnType<typeof import('@/lib/supabase/server').createServerClient>>;

/** Strips anything that could escape the intended folder. */
function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, '_')
    .slice(-120);
  return cleaned || 'clip.mp4';
}

/**
 * Builds the canonical object path for an upload.
 * Both ids come from the server — never from request input.
 */
export function buildVideoPath(userId: string, analysisId: string, originalName: string): string {
  return `${userId}/${analysisId}/${safeFileName(originalName)}`;
}

/**
 * Signed URL the browser can PUT the video straight to, so a 200 MB file never
 * passes through the Next.js server (which would blow serverless body limits).
 * Supabase validates the token and the storage RLS policy still applies.
 */
export async function createUploadUrl(
  supabase: SupabaseLike,
  path: string
): Promise<{ signedUrl: string; token: string } | { error: string }> {
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? 'Could not create an upload URL.' };
  return { signedUrl: data.signedUrl, token: data.token };
}

/**
 * Short-lived playback URL. Called only after the caller has been confirmed to
 * own the row (or to be staff), so this does not itself grant access.
 */
export async function createPlaybackUrl(
  supabase: SupabaseLike,
  path: string,
  bucket: string = VIDEO_BUCKET
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Removes every object under an analysis folder.
 * Storage has no recursive delete, so the folder is listed first.
 */
export async function deleteAnalysisObjects(
  supabase: SupabaseLike,
  userId: string,
  analysisId: string,
  bucket: string = VIDEO_BUCKET
): Promise<void> {
  const folder = `${userId}/${analysisId}`;
  const { data: files } = await supabase.storage.from(bucket).list(folder);
  if (!files?.length) return;
  await supabase.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`));
}

/* ==========================================================================
   FRAME PERSISTENCE

   Frames are extracted in the browser and were previously sent to the model
   and then thrown away when the tab closed. That made retry impossible: the
   only copy of what the model actually looked at lived in page memory, so a
   failed or interrupted analysis could never be re-run without asking the
   member to upload the whole clip again.

   They are now written to the private `analysis-frames` bucket and recorded in
   `shot_analyses.frame_paths`. Both the column (migration 0002) and the bucket
   (0002 + 0004, with owner-scoped RLS) already existed and were never used —
   this finishes the architecture that was already designed, and needs no
   schema change.

   Ownership follows the same rule as video: <user-uuid>/<analysis-id>/<file>,
   first segment compared to auth.uid() by the storage RLS policy.
   ========================================================================== */

/** Deterministic, index-ordered so a reload returns frames in time order. */
function framePath(userId: string, analysisId: string, index: number): string {
  return `${userId}/${analysisId}/frame-${String(index).padStart(2, '0')}.jpg`;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = Buffer.from(base64, 'base64');
  return new Uint8Array(binary);
}

/**
 * Writes the graded frames alongside the video.
 *
 * Best-effort by design: if this fails the analysis should still run, it just
 * will not be retryable. Never let frame archiving break a paid analysis.
 */
export async function storeFrames(
  supabase: SupabaseLike,
  userId: string,
  analysisId: string,
  frames: { base64: string; mediaType: string }[]
): Promise<string[]> {
  const stored: string[] = [];

  for (let i = 0; i < frames.length; i++) {
    const path = framePath(userId, analysisId, i);
    const { error } = await supabase.storage
      .from(FRAME_BUCKET)
      .upload(path, base64ToBytes(frames[i].base64), {
        contentType: frames[i].mediaType || 'image/jpeg',
        upsert: true,
      });
    if (error) {
      console.error('[ai] frame upload failed', path, error.message);
      continue;
    }
    stored.push(path);
  }

  return stored;
}

/**
 * Reads previously stored frames back so an analysis can be re-run server-side
 * without the member re-uploading anything.
 *
 * Returns an empty array when nothing was archived — the caller must then tell
 * the member to upload again rather than pretending a retry is possible.
 */
export async function loadFrames(
  supabase: SupabaseLike,
  paths: string[] | null | undefined
): Promise<{ base64: string; mediaType: string; timestampMs: number }[]> {
  if (!paths?.length) return [];

  const frames: { base64: string; mediaType: string; timestampMs: number }[] = [];

  for (const path of paths) {
    const { data, error } = await supabase.storage.from(FRAME_BUCKET).download(path);
    if (error || !data) {
      console.error('[ai] frame download failed', path, error?.message);
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    frames.push({
      base64: buffer.toString('base64'),
      mediaType: 'image/jpeg',
      timestampMs: 0,
    });
  }

  return frames;
}

/** Removes archived frames when an analysis is deleted. */
export async function deleteFrameObjects(
  supabase: SupabaseLike,
  userId: string,
  analysisId: string
): Promise<void> {
  const folder = `${userId}/${analysisId}`;
  const { data: files } = await supabase.storage.from(FRAME_BUCKET).list(folder);
  if (!files?.length) return;
  await supabase.storage.from(FRAME_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
}

/**
 * Confirms an object actually exists and is non-empty before an analysis is
 * marked as having a stored video — otherwise a failed browser upload would
 * leave a row pointing at nothing.
 */
export async function verifyUpload(
  supabase: SupabaseLike,
  userId: string,
  analysisId: string,
  fileName: string
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> {
  const folder = `${userId}/${analysisId}`;
  const target = safeFileName(fileName);
  const { data: files, error } = await supabase.storage.from(VIDEO_BUCKET).list(folder);

  if (error) return { ok: false, error: error.message };

  const found = files?.find((f) => f.name === target);
  if (!found) return { ok: false, error: 'The uploaded video was not found in storage.' };

  const bytes = (found.metadata as { size?: number } | null)?.size ?? 0;
  if (bytes <= 0) return { ok: false, error: 'The uploaded video is empty.' };

  return { ok: true, bytes };
}
