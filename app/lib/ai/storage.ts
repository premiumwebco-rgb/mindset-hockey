/* ==========================================================================
   VIDEO STORAGE  —  SERVER ONLY

   Fixes the gap the previous implementation left open: the source video was
   never stored, only frames were sent to the model and `video_path` held a
   bare filename. Nothing could be replayed, re-analysed, or handed to a coach.

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

import { VIDEO_BUCKET, SIGNED_URL_TTL } from './config';

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
