import "server-only";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Municipality, Ward } from "@/lib/types";

export async function loadMuni() {
  const viewer = await requireViewer();
  if (viewer.profile.platform_role !== "municipal_admin" || !viewer.profile.municipality_id) notFound();
  const supabase = await createClient();
  const [{ data: muni }, { data: wards }] = await Promise.all([
    supabase.from("municipalities").select("*").eq("id", viewer.profile.municipality_id).single<Municipality>(),
    supabase.from("wards").select("*").eq("municipality_id", viewer.profile.municipality_id).order("code"),
  ]);
  return { viewer, supabase, muni: muni!, wards: (wards ?? []) as Ward[] };
}
