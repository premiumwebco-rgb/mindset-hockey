import type { createServerClient } from './supabase/server';

/* ==========================================================================
   ADMIN PREVIEW SIGNED URLs

   Small shared helper used only by admin CMS list routes (resources,
   mindset lessons) to turn a private storage_path/cover_image_url/
   thumbnail_path/video_url into a short-lived signed URL the admin browser
   can render as an <img>/<video> preview.

   NOT the member-facing playback path (lib/library.ts, lib/ai/storage.ts) —
   those stay untouched. This is purely a display convenience for the admin
   console; it grants no new access, since createSignedUrl still runs
   through the session-scoped client and can only ever produce a link to an
   object that client is already allowed to read.
   ========================================================================== */

const TTL_SECONDS = 60 * 60; // 1 hour — long enough for one admin session.
const BUCKET = 'training-resources';

/**
 * Signs every non-null path in `paths`, in parallel, against the given
 * session-scoped Supabase client. Missing or failed signs simply resolve to
 * null rather than failing the whole list request.
 */
export async function signPreviewPaths(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => typeof p === 'string' && p.length > 0))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  await Promise.all(
    unique.map(async (path) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
      if (data?.signedUrl) out.set(path, data.signedUrl);
    })
  );
  return out;
}
