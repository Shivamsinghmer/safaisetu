import { AppShell, type NavItem, type NavSection } from "@/components/app-shell";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ORG_TYPE_META, OPEN_STATUSES } from "@/lib/constants";

const ROLE_LABELS = {
  citizen: "Citizen",
  worker: "Field worker",
  municipal_admin: "Municipal officer",
  super_admin: "Platform admin",
} as const;

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const role = viewer.profile.platform_role;
  const sections: NavSection[] = [];
  let mobileTabs: NavItem[] = [];

  if (role === "municipal_admin") {
    const [{ count: openCount }, { count: pendingOrgs }] = await Promise.all([
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("scope", "municipal")
        .in("status", ["submitted", "reopened"]),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    sections.push({
      title: "Municipality",
      items: [
        { href: "/app/muni", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/app/muni/tickets", label: "Complaint queue", icon: "tickets", badge: openCount ?? 0 },
        { href: "/app/muni/orgs", label: "Organizations", icon: "orgs", badge: pendingOrgs ?? 0 },
        { href: "/app/muni/workers", label: "Field workers", icon: "workers" },
        { href: "/app/muni/notices", label: "Announcements", icon: "notices" },
      ],
    });
    mobileTabs = [
      { href: "/app/muni", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/app/muni/tickets", label: "Queue", icon: "tickets" },
      { href: "/app/muni/orgs", label: "Orgs", icon: "orgs" },
      { href: "/app/muni/workers", label: "Workers", icon: "workers" },
    ];
  }

  if (role === "worker") {
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", viewer.userId)
      .in("status", ["assigned", "in_progress"]);
    sections.push({
      title: "Field work",
      items: [{ href: "/app/tasks", label: "My tasks", icon: "tasks", badge: count ?? 0 }],
    });
  }

  sections.push({
    title: role === "citizen" ? "You" : "As a citizen",
    items: [
      { href: "/app/home", label: "Home", icon: "home" },
      { href: "/app/report", label: "Report an issue", icon: "report" },
      { href: "/app/pickup", label: "Request pickup", icon: "pickup" },
      { href: "/app/tickets", label: "My tickets", icon: "tickets" },
      { href: "/app/learn", label: "Waste guide", icon: "learn" },
      { href: "/app/orgs", label: "Join or register", icon: "join" },
    ],
  });

  const activeMemberships = viewer.memberships.filter((m) => m.status === "active");
  const staffOrgIds = activeMemberships.filter((m) => m.role !== "member").map((m) => m.org_id);
  const openByOrg = new Map<string, number>();
  if (staffOrgIds.length) {
    const { data } = await supabase
      .from("tickets")
      .select("org_id")
      .in("org_id", staffOrgIds)
      .eq("scope", "internal")
      .in("status", OPEN_STATUSES);
    data?.forEach((t) => openByOrg.set(t.org_id, (openByOrg.get(t.org_id) ?? 0) + 1));
  }

  for (const m of activeMemberships) {
    const org = m.organization;
    const meta = ORG_TYPE_META[org.type];
    const base = `/app/org/${org.id}`;
    const items: NavItem[] = [{ href: base, label: "Overview", icon: "home", exact: true }];
    if (org.status === "approved") {
      if (m.role !== "member") {
        items.push({ href: `${base}/tickets`, label: "Tickets", icon: "tickets", badge: openByOrg.get(org.id) });
      }
      if (m.role === "admin") items.push({ href: `${base}/members`, label: meta.members, icon: "members" });
      items.push({ href: `${base}/notices`, label: "Notices", icon: "notices" });
      if (m.role === "admin" && org.type !== "society") items.push({ href: `${base}/qr`, label: "QR codes", icon: "qr" });
    }
    sections.push({
      title: m.role === "admin" ? `${meta.admin} · ${org.status === "approved" ? "admin" : org.status}` : meta.label,
      subtitle: org.name,
      items,
    });
  }

  if (!mobileTabs.length) {
    mobileTabs =
      role === "worker"
        ? [
            { href: "/app/tasks", label: "Tasks", icon: "tasks" },
            { href: "/app/report", label: "Report", icon: "report" },
            { href: "/app/tickets", label: "Mine", icon: "tickets" },
          ]
        : [
            { href: "/app/home", label: "Home", icon: "home" },
            { href: "/app/tickets", label: "Tickets", icon: "tickets" },
            { href: "/app/report", label: "Report", icon: "report" },
            { href: "/app/pickup", label: "Pickup", icon: "pickup" },
            { href: "/app/learn", label: "Learn", icon: "learn" },
          ];
  }

  const adminOf = activeMemberships.find((m) => m.role === "admin");
  const roleLabel =
    role === "citizen" && adminOf
      ? `${ORG_TYPE_META[adminOf.organization.type].admin}`
      : ROLE_LABELS[role];

  return (
    <AppShell
      sections={sections}
      mobileTabs={mobileTabs}
      name={viewer.profile.full_name || viewer.email}
      roleLabel={roleLabel}
    >
      {children}
    </AppShell>
  );
}
