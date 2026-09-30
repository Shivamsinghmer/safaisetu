import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types";

export const loadOrg = cache(async (orgId: string) => {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle<Organization>();
  if (!org) notFound();

  const membership = viewer.memberships.find((m) => m.org_id === orgId && m.status === "active") ?? null;
  const isAdmin = membership?.role === "admin";
  const isStaff = isAdmin || membership?.role === "staff";
  const isMuni = viewer.profile.platform_role === "municipal_admin";
  if (!membership && !isMuni && org.created_by !== viewer.userId) notFound();

  return { viewer, supabase, org, membership, isAdmin, isStaff, isMuni };
});
