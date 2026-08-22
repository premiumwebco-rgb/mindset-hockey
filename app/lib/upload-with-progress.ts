/* ==========================================================================
   CLIENT-ONLY UPLOAD HELPER

   No server imports — safe to pull into any 'use client' admin manager.
   PUTs a file straight to a Supabase Storage signed URL (never through the
   Next.js server) using XMLHttpRequest instead of fetch, purely because XHR
   is the only one of the two that exposes real upload-progress events. This
   is a display concern only — the destination, the signed URL and the
   authorization behind it are unchanged from the fetch-based PUT used
   elsewhere in the admin console.
   ========================================================================== */

export function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
  contentType?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    // Callers with a bucket-specific mime allowlist (e.g. video review's
    // resolveVideoContentType()) pass an explicit, known-good contentType so
    // the header sent here can never diverge from what Storage will accept.
    // Falls back to the file's own reported type, same as before, for
    // callers that don't need that (admin uploads to buckets without a
    // strict allowlist).
    xhr.setRequestHeader('content-type', contentType || file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`The upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('The upload failed — check your connection and try again.'));
    xhr.send(file);
  });
}
