import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Viewer } from "@/lib/session";

/**
 * If the viewer's email domain matches an approved college, add them as an
 * active member. Returns the joined org id (only on a new join).
 */
export async function autoJoinByEmailDomain(viewer: Viewer): Promise<string | null> {
  const domain = viewer.email.split("@")[1]?.toLowerCase();
  if (!domain || !process.env.SUPABASE_SECRET_KEY) return null;

  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select("id")
    .eq("type", "college")
    .eq("status", "approved")
    .eq("email_domain", domain);
  const target = orgs?.find((o) => !viewer.memberships.some((m) => m.org_id === o.id));
  if (!target) return null;

  const { error } = await admin
    .from("memberships")
    .insert({ org_id: target.id, user_id: viewer.userId, role: "member", status: "active" });
  return error ? null : target.id;
}
