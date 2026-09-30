import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterTabs, TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { OPEN_STATUSES } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import { loadOrg } from "../context";

export const metadata: Metadata = { title: "Tickets" };

export default async function OrgTicketsPage({ params, searchParams }: PageProps<"/app/org/[orgId]/tickets">) {
  const { orgId } = await params;
  const { tab = "open" } = (await searchParams) as { tab?: string };
  const { supabase, org, isStaff } = await loadOrg(orgId);
  if (!isStaff) notFound();

  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);
  const all = (data ?? []) as unknown as TicketListRow[];

  const groups: Record<string, TicketListRow[]> = {
    open: all.filter((t) => t.scope === "internal" && t.kind === "issue" && OPEN_STATUSES.includes(t.status)),
    pickups: all.filter((t) => t.scope === "internal" && t.kind === "pickup" && OPEN_STATUSES.includes(t.status)),
    municipal: all.filter((t) => t.scope === "municipal" && OPEN_STATUSES.includes(t.status)),
    resolved: all.filter((t) => ["resolved", "closed"].includes(t.status)),
    all,
  };
  const list = groups[tab] ?? groups.open!;

  return (
    <>
      <LiveRefresh channel={`org-tickets-${orgId}`} filter={`org_id=eq.${orgId}`} />
      <PageHeader label={org.name} title="Tickets" description="Issues and pickup requests raised inside your organization." />
      <FilterTabs
        active={tab}
        tabs={[
          { key: "open", label: "Open issues", href: "?tab=open", count: groups.open!.length },
          { key: "pickups", label: "Pickups", href: "?tab=pickups", count: groups.pickups!.length },
          { key: "municipal", label: "With municipality", href: "?tab=municipal", count: groups.municipal!.length },
          { key: "resolved", label: "Resolved", href: "?tab=resolved", count: groups.resolved!.length },
          { key: "all", label: "All", href: "?tab=all", count: all.length },
        ]}
      />
      {list.length ? (
        <TicketList tickets={list} showOrg={false} />
      ) : (
        <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title="Nothing here" description="Tickets in this view show up here as they come in." />
      )}
    </>
  );
}
