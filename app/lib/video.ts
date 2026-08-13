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
