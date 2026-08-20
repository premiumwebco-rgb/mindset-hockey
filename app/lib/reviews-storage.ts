/* ==========================================================================
   VIDEO REVIEW SUBMISSION STORAGE — SERVER ONLY

   Fixes the gap where app/api/reviews/route.ts recorded only a bare file
   name (`video_path: body.fileName`) and never actually stored the video —
   nothing could be played back, so /coach/review had nothing to show a coach.

   Deliberately NOT a new storage system: this reuses the same private
   `member-videos` bucket and the same ownership convention that
   lib/ai/storage.ts already established for AI Shot Analysis —
   `<user-uuid>/<row-id>/<filename>`, first path segment compared to
   auth.uid() by the storage RLS policy from migration 0002
   (member_videos_own_read / _write / _delete). Writing there additionally
   requires `auth_has_tier('premium')`, which already matches
   FEATURE_MIN_TIER.video_review — a member who can reach /reviews/new is
   always premium, so the storage policy never blocks a legitimate upload.

   The row id here is a video_submissions.id rather than a shot_analyses.id —
   conceptually identical, just a different owning table — so these helpers
   are kept separate from lib/ai/storage.ts rather than overloading its
   analysis-specific naming.
   ========================================================================== */

import { VIDEO_BUCKET, SIGNED_URL_TTL } from './ai/config';

if (typeof window !== 'undefined') {
  throw new Error('lib/reviews-storage.ts is server-only and was imported from client code.');
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
 * Builds the canonical object path for a video review upload.
 * Both ids come from the server — never from request input.
 */
export function buildSubmissionPath(userId: string, submissionId: string, originalName: string): string {
  return `${userId}/${submissionId}/${safeFileName(originalName)}`;
}

/**
 * Signed URL the browser can PUT the video straight to, so a large file never
 * passes through the Next.js server. Mirrors lib/ai/storage.ts's
 * createUploadUrl exactly, against the same bucket.
 */
export async function createSubmissionUploadUrl(
  supabase: SupabaseLike,
  path: string
): Promise<{ signedUrl: string; token: string } | { error: string }> {
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? 'Could not create an upload URL.' };
  return { signedUrl: data.signedUrl, token: data.token };
}

/**
 * Short-lived playback URL. Called only after the caller has been confirmed
 * to own the submission (or to be staff) — this does not itself grant access.
 */
export async function createSubmissionPlaybackUrl(
  supabase: SupabaseLike,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Confirms the uploaded object actually exists and is non-empty before a
 * submission is moved from 'uploading' to 'queued' — otherwise a failed or
 * abandoned browser upload would leave a row pointing at nothing, and the
 * coach queue would show a submission with no video behind it.
 */
export async function verifySubmissionUpload(
  supabase: SupabaseLike,
  userId: string,
  submissionId: string,
  fileName: string
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> {
  const folder = `${userId}/${submissionId}`;
  const target = safeFileName(fileName);
  const { data: files, error } = await supabase.storage.from(VIDEO_BUCKET).list(folder);

  if (error) return { ok: false, error: error.message };

  const found = files?.find((f) => f.name === target);
  if (!found) return { ok: false, error: 'The uploaded video was not found in storage.' };

  const bytes = (found.metadata as { size?: number } | null)?.size ?? 0;
  if (bytes <= 0) return { ok: false, error: 'The uploaded video is empty.' };

  return { ok: true, bytes };
}
