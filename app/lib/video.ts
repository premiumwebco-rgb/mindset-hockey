/* Shared video validation for member uploads (video review submissions). */

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

/** Returns an error string, or null when the file is acceptable. */
export function validateVideo(file: File): string | null {
  const okType =
    ACCEPTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);
  if (!okType) return 'Use an MP4, MOV or WEBM file.';
  if (file.size > MAX_VIDEO_BYTES) return 'That file is over 200 MB. Trim the clip and try again.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/**
 * The Content-Type header actually sent on the PUT to Supabase Storage.
 *
 * The member-videos bucket now enforces allowed_mime_types (mp4/quicktime/
 * webm) at the storage layer, matched exactly to ACCEPTED_VIDEO_TYPES above.
 * Storage checks the literal Content-Type header on the PUT request — it has
 * no filename-extension fallback the way validateVideo() does. Some mobile
 * pickers hand back an empty or nonstandard `file.type` for a video that is
 * still a perfectly valid .mp4/.mov/.webm (this is common enough that
 * validateVideo() already tolerates it via the filename regex), so a raw
 * `file.type || 'application/octet-stream'` header would pass client
 * validation and then get rejected by Storage's mime allowlist. This
 * resolves to a real accepted type whenever validateVideo() would have
 * passed, so the header sent to Storage always matches what Storage expects.
 */
export function resolveVideoContentType(file: File): string {
  if ((ACCEPTED_VIDEO_TYPES as string[]).includes(file.type)) return file.type;
  if (/\.mp4$/i.test(file.name)) return 'video/mp4';
  if (/\.mov$/i.test(file.name)) return 'video/quicktime';
  if (/\.webm$/i.test(file.name)) return 'video/webm';
  return 'video/mp4';
}
