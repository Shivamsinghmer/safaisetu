import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatHours, hoursBetween } from "@/lib/utils";
import { loadMuni } from "../data";

export const metadata: Metadata = { title: "Field workers" };

export default async function WorkersPage() {
  const { supabase, viewer } = await loadMuni();
  const [{ data: workers }, { data: tasks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("platform_role", "worker")
      .eq("municipality_id", viewer.profile.municipality_id!)
      .order("full_name"),
    supabase
      .from("tickets")
      .select("assigned_to, status, created_at, resolved_at")
      .not("assigned_to", "is", null),
  ]);

  const rows = (workers ?? []).map((w) => {
    const mine = tasks?.filter((t) => t.assigned_to === w.id) ?? [];
    const done = mine.filter((t) => t.resolved_at);
    return {
      ...w,
      active: mine.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
      done: done.length,
      avg: done.length ? done.reduce((s, t) => s + hoursBetween(t.created_at, t.resolved_at!), 0) / done.length : NaN,
    };
  });

  return (
    <>
      <PageHeader label="Municipality" title="Field workers" description="Sanitation staff who receive assignments and upload proof of cleanup." />
      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((w) => (
            <Card key={w.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={w.full_name} className="h-10 w-10 text-xs" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{w.full_name}</div>
                  <div className="truncate text-xs text-slate">{w.phone ?? w.email}</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-bone pt-4 text-center">
                {[
                  ["Active", w.active],
                  ["Resolved", w.done],
                  ["Avg time", formatHours(w.avg)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dd className="font-display text-xl font-bold tracking-[-0.03em] text-onyx tabular-nums">{v}</dd>
                    <dt className="label-mono mt-0.5">{k}</dt>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HardHat className="h-8 w-8" />}
          title="No field workers yet"
          description="Worker accounts are created by the platform admin and linked to your municipality."
        />
      )}
    </>
  );
}
