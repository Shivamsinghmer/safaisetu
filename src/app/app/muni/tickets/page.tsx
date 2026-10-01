import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { ClipboardCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterTabs, TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { OPEN_STATUSES } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { loadMuni } from "../data";

export const metadata: Metadata = { title: "Complaint queue" };

const PAGE_SIZE = 50;
type Tab = "new" | "overdue" | "active" | "pickups" | "flagged" | "resolved" | "all";
const TABS: Tab[] = ["new", "overdue", "active", "pickups", "flagged", "resolved", "all"];

export default async function MuniQueuePage({ searchParams }: PageProps<"/app/muni/tickets">) {
  const sp = (await searchParams) as { tab?: string; ward?: string; page?: string };
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "new";
  const ward = sp.ward;
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase, wards } = await loadMuni();
  const nowIso = new Date().toISOString();

  // Every tab is its own filtered query, counted and paged in the database
  const scoped = <Q extends { eq: (c: string, v: string) => Q }>(q: Q) => (ward ? q.eq("ward_id", ward) : q);
  const filter = (t: Tab, q: ReturnType<typeof baseQuery>) => {
    if (t === "new") return q.in("status", ["submitted", "reopened"]);
    if (t === "overdue") return q.in("status", OPEN_STATUSES).lt("sla_due_at", nowIso);
    if (t === "active") return q.in("status", ["assigned", "in_progress"]);
    if (t === "pickups") return q.eq("kind", "pickup").in("status", OPEN_STATUSES);
    // Cleanups whose after photo the AI check flagged or couldn't confirm
    if (t === "flagged") return q.in("status", ["resolved", "closed"]).in("after_check->>verdict", ["review", "fail"]);
    if (t === "resolved") return q.in("status", ["resolved", "closed"]);
    return q;
  };
  function baseQuery(select: string, head = false) {
    return scoped(supabase.from("tickets").select(select, head ? { count: "exact", head: true } : { count: "exact" }).eq("scope", "municipal"));
  }

  const working = tab !== "resolved" && tab !== "flagged" && tab !== "all";
  let listQuery = filter(tab, baseQuery(TICKET_LIST_SELECT));
  listQuery = working
    ? listQuery.order("severity", { ascending: false }).order("created_at", { ascending: true })
    : listQuery.order("created_at", { ascending: false });
  const [{ data, count: total }, ...counts] = await Promise.all([
    listQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ...TABS.map((t) => filter(t, baseQuery("id", true))),
  ]);
  const list = (data ?? []) as unknown as TicketListRow[];
  const countOf = Object.fromEntries(TABS.map((t, i) => [t, counts[i]?.count ?? 0])) as Record<Tab, number>;
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const qs = (t: string, p = 1) => `?tab=${t}${ward ? `&ward=${ward}` : ""}${p > 1 ? `&page=${p}` : ""}`;

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
          { key: "new", label: "Needs assignment", href: qs("new"), count: countOf.new },
          { key: "overdue", label: "Past SLA", href: qs("overdue"), count: countOf.overdue },
          { key: "active", label: "In the field", href: qs("active"), count: countOf.active },
          { key: "pickups", label: "Pickups", href: qs("pickups"), count: countOf.pickups },
          { key: "flagged", label: "Flagged by AI", href: qs("flagged"), count: countOf.flagged },
          { key: "resolved", label: "Resolved", href: qs("resolved"), count: countOf.resolved },
          { key: "all", label: "All", href: qs("all"), count: countOf.all },
        ]}
      />
      {list.length ? (
        <>
          <TicketList tickets={list} showWard />
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
              <span className="text-slate">
                Page {page} of {pages} · {total} tickets
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={qs(tab, page - 1)} className="rounded-full border border-bone bg-card px-4 py-2 font-semibold text-ink">
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link href={qs(tab, page + 1)} className="rounded-full border border-bone bg-card px-4 py-2 font-semibold text-ink">
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
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
      transitionTypes={[]}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-bold",
        active ? "border-blue bg-blue/5 text-blue" : "border-bone bg-white text-carbon hover:bg-mist",
      )}
    >
      {children}
    </Link>
  );
}
