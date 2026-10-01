import { CleanupGallery, type CleanupRow } from "@/components/cleanup-gallery";
import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { TicketList } from "@/components/ticket-list";
import { LiveRefresh } from "@/components/live-refresh";
import { BreakdownBars, DailyVolumeChart } from "@/components/charts";
import { categoryLabel, ORG_TYPE_META } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import type { OrgType } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";
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

  // Numbers come from aggregates computed in Postgres (row-level security limits them to this
  // municipality's wards), so they stay correct however many tickets there are.
  const [
    { data: ticketRows },
    { data: orgRows },
    { data: wardRows },
    { data: dailyRows },
    { data: breakdownRows },
    { data: urgentRows },
    { data: cleanupRows },
  ] =
    await Promise.all([
      // Map points only: recent tickets, capped for the map's sake
      supabase
        .from("tickets")
        .select(`${TICKET_LIST_SELECT}, resolved_at`)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1500),
      supabase.from("organizations").select("id, name, type, status, lat, lng, ward_id"),
      supabase.rpc("muni_ward_stats", { p_days: DAYS }),
      supabase.rpc("muni_daily_counts", { p_days: DAYS }),
      supabase.rpc("muni_breakdowns", { p_days: DAYS }),
      supabase
        .from("tickets")
        .select(TICKET_LIST_SELECT)
        .eq("scope", "municipal")
        .in("status", ["submitted", "reopened"])
        .order("severity", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(8),
      // Latest work with an after photo, for the before/after review strip
      supabase
        .from("tickets")
        .select(`${TICKET_LIST_SELECT}, resolved_at`)
        .in("status", ["resolved", "closed", "reopened"])
        .not("after_photo_path", "is", null)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);
  const cleanups = (cleanupRows ?? []) as unknown as CleanupRow[];
  const needsAssignment = (urgentRows ?? []) as unknown as TicketListRow[];
  const tickets = (ticketRows ?? []) as unknown as (TicketListRow & { resolved_at: string | null })[];
  const orgs = (orgRows ?? []) as { id: string; name: string; type: OrgType; status: string; lat: number; lng: number; ward_id: string | null }[];
  const approvedOrgs = orgs.filter((o) => o.status === "approved");

  type WardRow = {
    ward_id: string | null;
    total: number;
    open: number;
    unassigned: number;
    overdue: number;
    resolved: number;
    resolved_7d: number;
    avg_hours: number | null;
  };
  const byWard = new Map(((wardRows ?? []) as WardRow[]).map((w) => [w.ward_id, w]));
  const all = [...byWard.values()];
  const sum = (k: keyof WardRow) => all.reduce((a, w) => a + (Number(w[k]) || 0), 0);
  const open = sum("open");
  const unassigned = sum("unassigned");
  const overdue = sum("overdue");
  const resolvedCount = sum("resolved");
  const resolved7 = sum("resolved_7d");
  const avgRes = resolvedCount
    ? all.reduce((a, w) => a + (w.avg_hours ?? 0) * w.resolved, 0) / resolvedCount
    : NaN;

  // Daily series
  const days = ((dailyRows ?? []) as { day: string; reported: number; resolved: number }[]).map((d) => {
    const date = new Date(`${d.day}T00:00:00`);
    return {
      key: d.day,
      day: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      reported: d.reported,
      resolved: d.resolved,
    };
  });

  // Category and organization breakdowns
  const breakdowns = (breakdownRows ?? []) as { kind: string; key: string; n: number }[];
  const categories = breakdowns
    .filter((b) => b.kind === "category")
    .sort((a, b) => b.n - a.n)
    .map((b) => ({ label: categoryLabel(b.key), value: b.n }));

  // Ward hotspots
  const wardStats = wards
    .map((w) => {
      const r = byWard.get(w.id);
      return {
        ward: w,
        total: r?.total ?? 0,
        open: r?.open ?? 0,
        overdue: r?.overdue ?? 0,
        avg: r?.avg_hours ?? NaN,
        orgs: approvedOrgs.filter((o) => o.ward_id === w.id).length,
      };
    })
    .sort((a, b) => b.open - a.open || b.total - a.total);

  // Organizations with the most complaints
  const repeatOrgs = breakdowns
    .filter((b) => b.kind === "org")
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((b) => {
      const o = orgs.find((x) => x.id === b.key);
      return { label: o?.name ?? "Unknown", value: b.n, sub: o ? ORG_TYPE_META[o.type].label : undefined };
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
          <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.04em] sm:text-[30px] md:text-heading">City overview</h1>
          <p className="mt-1 text-[15px] text-slate">
            {wards.length} wards · {orgTypeCounts.join(" · ")}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open complaints" value={open} caption={`${unassigned} not yet assigned`} />
        <StatCard
          label="Past SLA"
          value={overdue}
          caption={open ? `${Math.round((overdue / open) * 100)}% of open tickets` : "None open"}
          tone={overdue ? "danger" : "good"}
        />
        <StatCard label="Resolved this week" value={resolved7} caption={`${resolvedCount} in ${DAYS} days`} tone="good" />
        <StatCard label="Avg resolution" value={formatHours(avgRes)} caption="Report → resolved" />
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader label="Map" title="Where the waste problems are" />
        <MapPanel
          tickets={tickets.map((t) => ({ id: t.id, code: t.code, lat: t.lat, lng: t.lng, status: t.status, label: categoryLabel(t.category) }))}
          orgs={approvedOrgs.map((o) => ({ id: o.id, name: o.name, lat: o.lat, lng: o.lng, type: o.type }))}
        />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
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

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader label="Hotspots" title="Wards ranked by open complaints" />
          {/* Phones: compact ward rows instead of a sideways-scrolling table */}
          <ul className="divide-y divide-bone sm:hidden">
            {wardStats.map((w, i) => (
              <li key={w.ward.id}>
                <Link href={`/app/muni/tickets?ward=${w.ward.id}`} className="block px-4 py-3.5 active:bg-mist">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate font-semibold text-ink">{w.ward.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ash">{w.ward.code}</span>
                    {i === 0 && w.open > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral">Top hotspot</span>
                    )}
                  </div>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <dt className="text-ash">Open</dt>
                      <dd className="font-mono text-carbon tabular-nums">{w.open}</dd>
                    </div>
                    <div>
                      <dt className="text-ash">Past SLA</dt>
                      <dd className={cn("font-mono tabular-nums", w.overdue ? "font-semibold text-coral" : "text-carbon")}>{w.overdue}</dd>
                    </div>
                    <div>
                      <dt className="text-ash">{DAYS}d total</dt>
                      <dd className="font-mono text-carbon tabular-nums">{w.total}</dd>
                    </div>
                    <div>
                      <dt className="text-ash">Avg fix</dt>
                      <dd className="font-mono text-carbon tabular-nums">{formatHours(w.avg)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
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

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Recent cleanups</h2>
            <p className="text-sm text-slate">Before and after photos from the field, with the reporter&apos;s approval.</p>
          </div>
          <Link href="/app/muni/tickets?tab=resolved" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue">
            All resolved <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {cleanups.length ? (
          <CleanupGallery tickets={cleanups} />
        ) : (
          <Card className="p-6 text-sm text-slate">
            No cleanups with an after photo yet. They appear here as soon as a worker resolves a complaint.
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Needs assignment</h2>
          <Link href="/app/muni/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
            Full queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {needsAssignment.length ? (
          <TicketList tickets={needsAssignment} showWard />
        ) : (
          <Card className="p-6 text-sm text-slate">Every open complaint has a worker assigned.</Card>
        )}
      </section>
    </>
  );
}
