import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization, Profile } from "@/lib/types";

export type MembershipWithOrg = Membership & { organization: Organization };

export interface Viewer {
  userId: string;
  email: string;
  profile: Profile;
  memberships: MembershipWithOrg[];
}

/** Current user, their profile and organization memberships (once per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const userId = claims.sub;
  const email = (claims.email as string | undefined) ?? "";

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (!profile) {
    const meta = (claims.user_metadata ?? {}) as { full_name?: string; phone?: string };
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, email, full_name: meta.full_name ?? email.split("@")[0], phone: meta.phone ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      );
    ({ data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>());
  }
  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, organization:organizations(*)")
    .eq("user_id", userId)
    .neq("status", "removed")
    .order("created_at");

  return {
    userId,
    email,
    profile,
    memberships: ((memberships ?? []) as MembershipWithOrg[]).filter((m) => m.organization),
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export function adminOrgs(viewer: Viewer) {
  return viewer.memberships.filter((m) => m.status === "active" && m.role === "admin");
}

export function activeMembership(viewer: Viewer, orgId: string) {
  return viewer.memberships.find((m) => m.org_id === orgId && m.status === "active");
}
