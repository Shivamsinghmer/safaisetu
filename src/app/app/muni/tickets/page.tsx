import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterTabs, TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { OPEN_STATUSES } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import { cn, isOverdue } from "@/lib/utils";
import { loadMuni } from "../data";

export const metadata: Metadata = { title: "Complaint queue" };

export default async function MuniQueuePage({ searchParams }: PageProps<"/app/muni/tickets">) {
  const { tab = "new", ward } = (await searchParams) as { tab?: string; ward?: string };
  const { supabase, wards } = await loadMuni();

  let q = supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("scope", "municipal")
    .order("created_at", { ascending: false })
    .limit(500);
  if (ward) q = q.eq("ward_id", ward);
  const { data } = await q;
  const all = (data ?? []) as unknown as TicketListRow[];

  const groups: Record<string, TicketListRow[]> = {
    new: all.filter((t) => ["submitted", "reopened"].includes(t.status)),
    overdue: all.filter((t) => isOverdue(t.sla_due_at, t.status)),
    active: all.filter((t) => ["assigned", "in_progress"].includes(t.status)),
    pickups: all.filter((t) => t.kind === "pickup" && OPEN_STATUSES.includes(t.status)),
    resolved: all.filter((t) => ["resolved", "closed"].includes(t.status)),
    all,
  };
  const list = (groups[tab] ?? groups.new!).sort((a, b) => {
    // most severe & oldest first in working views
    if (tab === "resolved" || tab === "all") return 0;
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity] || a.created_at.localeCompare(b.created_at);
  });
  const qs = (t: string) => `?tab=${t}${ward ? `&ward=${ward}` : ""}`;

  return (
    <>
      <LiveRefresh channel="muni-queue" />
      <PageHeader
        label="Municipality"
        title="Complaint queue"
        description="Public reports, escalations from organizations, and batched pickup requests. Most severe and oldest first."
      />
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <WardChip href={`?tab=${tab}`} active={!ward}>
          All wards
        </WardChip>
        {wards.map((w) => (
          <WardChip key={w.id} href={`?tab=${tab}&ward=${w.id}`} active={ward === w.id}>
            {w.name}
          </WardChip>
        ))}
      </div>
      <FilterTabs
        active={tab}
        tabs={[
          { key: "new", label: "Needs assignment", href: qs("new"), count: groups.new!.length },
          { key: "overdue", label: "Past SLA", href: qs("overdue"), count: groups.overdue!.length },
          { key: "active", label: "In the field", href: qs("active"), count: groups.active!.length },
          { key: "pickups", label: "Pickups", href: qs("pickups"), count: groups.pickups!.length },
          { key: "resolved", label: "Resolved", href: qs("resolved"), count: groups.resolved!.length },
          { key: "all", label: "All", href: qs("all"), count: all.length },
        ]}
      />
      {list.length ? (
        <TicketList tickets={list} showWard />
      ) : (
        <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title="Queue clear" description="Nothing in this view right now." />
      )}
    </>
  );
}

function WardChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-bold",
        active ? "border-blue bg-blue/5 text-blue" : "border-bone bg-white text-carbon hover:bg-mist",
      )}
    >
      {children}
    </Link>
  );
}
