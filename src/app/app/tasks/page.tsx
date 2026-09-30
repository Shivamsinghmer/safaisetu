import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { OverviewMap } from "@/components/maps";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";

export const metadata: Metadata = { title: "My tasks" };

export default async function TasksPage() {
  const viewer = await requireViewer();
  if (viewer.profile.platform_role !== "worker") notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("assigned_to", viewer.userId)
    .order("updated_at", { ascending: false })
    .limit(200);
  const all = (data ?? []) as unknown as TicketListRow[];
  const active = all
    .filter((t) => ["assigned", "in_progress"].includes(t.status))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = all.filter((t) => ["resolved", "closed"].includes(t.status) && t.updated_at.startsWith(today)).length;

  return (
    <>
      <LiveRefresh channel={`tasks-${viewer.userId}`} filter={`assigned_to=eq.${viewer.userId}`} />
      <PageHeader label="Field work" title="My tasks" description="Open a task, go to the pin, clean up, and upload an after photo as proof." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="To do" value={active.filter((t) => t.status === "assigned").length} />
        <StatCard label="In progress" value={active.filter((t) => t.status === "in_progress").length} />
        <StatCard label="Done today" value={doneToday} tone="good" />
      </div>
      {active.length ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <TicketList tickets={active} showWard />
          <Card className="self-start overflow-hidden">
            <CardHeader label="Route" title="Today's stops" />
            <OverviewMap
              height={360}
              tickets={active.map((t) => ({ id: t.id, code: t.code, lat: t.lat, lng: t.lng, status: t.status, label: categoryLabel(t.category) }))}
            />
          </Card>
        </div>
      ) : (
        <EmptyState icon={<ListChecks className="h-8 w-8" />} title="No tasks assigned" description="New assignments appear here instantly." />
      )}
    </>
  );
}
