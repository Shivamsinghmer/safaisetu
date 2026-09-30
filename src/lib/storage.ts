import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTO_BUCKET = "complaint-photos";
export const DOC_BUCKET = "org-documents";

/**
 * Signed URLs for private objects. Call only for paths taken from rows the
 * current user already fetched through RLS.
 */
export async function signedUrls(paths: (string | null | undefined)[], bucket = PHOTO_BUCKET, expiresIn = 3600) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  // Seeded demo photos are plain https URLs rather than storage paths
  for (const p of unique) if (p.startsWith("http")) map.set(p, p);
  const storagePaths = unique.filter((p) => !p.startsWith("http"));
  if (!storagePaths.length) return map;
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(storagePaths, expiresIn);
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}
