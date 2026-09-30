import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { FilterTabs, TicketList } from "@/components/ticket-list";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { OPEN_STATUSES } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";

export const metadata: Metadata = { title: "My tickets" };

export default async function MyTicketsPage({ searchParams }: PageProps<"/app/tickets">) {
  const { tab = "open" } = (await searchParams) as { tab?: string };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("reporter_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(200);
  const all = (data ?? []) as unknown as TicketListRow[];

  const groups = {
    open: all.filter((t) => OPEN_STATUSES.includes(t.status)),
    review: all.filter((t) => t.status === "resolved"),
    done: all.filter((t) => ["closed", "rejected"].includes(t.status)),
  };
  const list = groups[tab as keyof typeof groups] ?? groups.open;

  return (
    <>
      <PageHeader
        label="Tracking"
        title="My tickets"
        description="Everything you've reported or requested, with live status."
        actions={
          <>
            <ButtonLink href="/app/pickup" variant="secondary">
              Request pickup
            </ButtonLink>
            <ButtonLink href="/app/report">Report issue</ButtonLink>
          </>
        }
      />
      <FilterTabs
        active={tab}
        tabs={[
          { key: "open", label: "Open", href: "?tab=open", count: groups.open.length },
          { key: "review", label: "Needs your confirmation", href: "?tab=review", count: groups.review.length },
          { key: "done", label: "Closed", href: "?tab=done", count: groups.done.length },
        ]}
      />
      {list.length ? (
        <TicketList tickets={list} />
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title={tab === "review" ? "Nothing to confirm" : "No tickets here yet"}
          description="Spotted an overflowing bin or garbage on the road? Report it in under a minute."
          action={<ButtonLink href="/app/report">Report an issue</ButtonLink>}
        />
      )}
    </>
  );
}
