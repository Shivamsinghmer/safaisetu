import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { autoJoinByEmailDomain } from "@/lib/orgs";

export default async function AppIndex() {
  const viewer = await requireViewer();
  const role = viewer.profile.platform_role;
  if (role === "municipal_admin") redirect("/app/muni");
  if (role === "worker") redirect("/app/tasks");

  // Students/staff signing up with a campus email join their college automatically
  const joined = await autoJoinByEmailDomain(viewer);
  if (joined) redirect(`/app/org/${joined}?welcome=1`);

  const admin = viewer.memberships.find((m) => m.status === "active" && m.role === "admin");
  if (admin) redirect(`/app/org/${admin.org_id}`);
  redirect("/app/home");
}
