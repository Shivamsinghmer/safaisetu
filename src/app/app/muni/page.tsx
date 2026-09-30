import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { BreakdownBars, DailyVolumeChart } from "@/components/charts";
import { categoryLabel, OPEN_STATUSES, ORG_TYPE_META } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import type { OrgType } from "@/lib/types";
import { cn, formatHours, hoursBetween, isOverdue } from "@/lib/utils";
import { loadMuni } from "./data";
import { MapPanel } from "./map-panel";

export const metadata: Metadata = { title: "Municipal dashboard" };

const DAYS = 30;

/** Request time for this render (server component, rendered per request). */
function requestTime() {
  return Date.now();
}

export default async function MuniDashboard() {
  const { supabase, muni, wards } = await loadMuni();
  const now = requestTime();
  const since = new Date(now - DAYS * 86400000).toISOString();

  const [{ data: ticketRows }, { data: orgRows }] = await Promise.all([
    supabase
      .from("tickets")
      .select(`${TICKET_LIST_SELECT}, resolved_at`)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("organizations").select("id, name, type, status, lat, lng, ward_id"),
  ]);
  const tickets = (ticketRows ?? []) as unknown as (TicketListRow & { resolved_at: string | null })[];
  const orgs = (orgRows ?? []) as { id: string; name: string; type: OrgType; status: string; lat: number; lng: number; ward_id: string | null }[];
  const approvedOrgs = orgs.filter((o) => o.status === "approved");

  const municipal = tickets.filter((t) => t.scope === "municipal");
  const open = municipal.filter((t) => OPEN_STATUSES.includes(t.status));
  const unassigned = open.filter((t) => ["submitted", "reopened"].includes(t.status));
  const overdue = open.filter((t) => isOverdue(t.sla_due_at, t.status));
  const resolved = tickets.filter((t) => t.resolved_at);
  const avgRes = resolved.length
    ? resolved.reduce((s, t) => s + hoursBetween(t.created_at, t.resolved_at!), 0) / resolved.length
    : NaN;
  const weekAgo = now - 7 * 86400000;
  const resolved7 = resolved.filter((t) => new Date(t.resolved_at!).getTime() > weekAgo).length;

  // Daily series
  const days = [...Array(DAYS)].map((_, i) => {
    const d = new Date(now - (DAYS - 1 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      day: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      reported: 0,
      resolved: 0,
    };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  tickets.forEach((t) => {
    const d = byKey.get(t.created_at.slice(0, 10));
    if (d) d.reported++;
    if (t.resolved_at) {
      const r = byKey.get(t.resolved_at.slice(0, 10));
      if (r) r.resolved++;
    }
  });

  // Category breakdown (issues only)
  const catCounts = new Map<string, number>();
  tickets.filter((t) => t.kind === "issue").forEach((t) => catCounts.set(t.category, (catCounts.get(t.category) ?? 0) + 1));
  const categories = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: categoryLabel(c), value: n }));

  // Ward hotspots
  const wardStats = wards
    .map((w) => {
      const wt = tickets.filter((t) => t.ward_id === w.id);
      const wOpen = wt.filter((t) => OPEN_STATUSES.includes(t.status));
      const wRes = wt.filter((t) => t.resolved_at);
      return {
        ward: w,
        total: wt.length,
        open: wOpen.length,
        overdue: wOpen.filter((t) => isOverdue(t.sla_due_at, t.status)).length,
        avg: wRes.length ? wRes.reduce((s, t) => s + hoursBetween(t.created_at, t.resolved_at!), 0) / wRes.length : NaN,
        orgs: approvedOrgs.filter((o) => o.ward_id === w.id).length,
      };
    })
    .sort((a, b) => b.open - a.open || b.total - a.total);

  // Organizations with the most complaints
  const orgCounts = new Map<string, number>();
  tickets.forEach((t) => t.org_id && orgCounts.set(t.org_id, (orgCounts.get(t.org_id) ?? 0) + 1));
  const repeatOrgs = [...orgCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => {
      const o = orgs.find((x) => x.id === id);
      return { label: o?.name ?? "Unknown", value: n, sub: o ? ORG_TYPE_META[o.type].label : undefined };
    });

  const orgTypeCounts = (["society", "college", "public_place"] as OrgType[]).map(
    (t) => `${approvedOrgs.filter((o) => o.type === t).length} ${ORG_TYPE_META[t].plural.toLowerCase()}`,
  );

  return (
    <>
      <LiveRefresh channel="muni-dashboard" />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <div className="label-mono mb-2">
            {muni.name} · last {DAYS} days
          </div>
          <h1 className="font-display text-[30px] leading-tight font-bold tracking-[-0.04em] sm:text-heading">City overview</h1>
          <p className="mt-1 text-[15px] text-slate">
            {wards.length} wards · {orgTypeCounts.join(" · ")}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open complaints" value={open.length} caption={`${unassigned.length} not yet assigned`} />
        <StatCard
          label="Past SLA"
          value={overdue.length}
          caption={open.length ? `${Math.round((overdue.length / open.length) * 100)}% of open tickets` : "None open"}
          tone={overdue.length ? "danger" : "good"}
        />
        <StatCard label="Resolved this week" value={resolved7} caption={`${resolved.length} in ${DAYS} days`} tone="good" />
        <StatCard label="Avg resolution" value={formatHours(avgRes)} caption="Report → resolved" />
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader label="Map" title="Where the waste problems are" />
        <MapPanel
          tickets={tickets.map((t) => ({ id: t.id, code: t.code, lat: t.lat, lng: t.lng, status: t.status, label: categoryLabel(t.category) }))}
          orgs={approvedOrgs.map((o) => ({ id: o.id, name: o.name, lat: o.lat, lng: o.lng, type: o.type }))}
        />
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader label="Trend" title="New complaints per day" />
          <div className="p-5">
            <DailyVolumeChart data={days} />
          </div>
        </Card>
        <Card>
          <CardHeader label="Breakdown" title="Issues by category" />
          <div className="p-5">
            {categories.length ? <BreakdownBars rows={categories} /> : <p className="text-sm text-ash">No issues yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader label="Hotspots" title="Wards ranked by open complaints" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bone text-left">
                  {["Ward", "Open", "Past SLA", `${DAYS}d total`, "Avg resolution", "Orgs"].map((h) => (
                    <th key={h} className="label-mono px-5 py-2.5 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bone">
                {wardStats.map((w, i) => (
                  <tr key={w.ward.id} className="hover:bg-mist">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link href={`/app/muni/tickets?ward=${w.ward.id}`} className="font-semibold text-ink hover:text-blue">
                        {w.ward.name}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-ash">{w.ward.code}</span>
                      {i === 0 && w.open > 0 && (
                        <span className="ml-2 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral">Top hotspot</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums">{w.open}</td>
                    <td className={cn("px-5 py-3 font-mono tabular-nums", w.overdue && "font-semibold text-coral")}>
                      {w.overdue ? (
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {w.overdue}
                        </span>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums">{w.total}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{formatHours(w.avg)}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{w.orgs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader label="Repeat locations" title="Organizations with most reports" />
          <div className="p-5">
            {repeatOrgs.length ? <BreakdownBars rows={repeatOrgs} /> : <p className="text-sm text-ash">No organization reports yet.</p>}
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Needs assignment</h2>
          <Link href="/app/muni/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
            Full queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {unassigned.length ? (
          <TicketList tickets={unassigned.slice(0, 8)} showWard />
        ) : (
          <Card className="p-6 text-sm text-slate">Every open complaint has a worker assigned.</Card>
        )}
      </section>
    </>
  );
}
