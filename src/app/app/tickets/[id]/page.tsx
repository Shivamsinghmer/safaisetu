import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, CalendarCheck, CalendarDays, CheckCircle2, Clock, MapPin, Navigation, Phone, QrCode, Sparkles, Star, Users } from "lucide-react";
import { Card, CardHeader, Pill, SeverityTag, StatusPill } from "@/components/ui";
import { OverviewMap } from "@/components/maps";
import { LiveRefresh } from "@/components/live-refresh";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import { STATUS_META, categoryLabel, ORG_TYPE_META } from "@/lib/constants";
import type { Organization, Ticket, TicketEvent } from "@/lib/types";
import { cn, formatDate, formatHours, hoursBetween, isOverdue, timeAgo } from "@/lib/utils";
import { TicketActions } from "./ticket-actions";
import { getT } from "@/lib/i18n-server";
import { categoryText } from "@/lib/i18n";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage({ params, searchParams }: PageProps<"/app/tickets/[id]">) {
  const { id } = await params;
  const { new: isNew } = (await searchParams) as { new?: string };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { t, locale } = await getT();

  const { data: ticket } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle<Ticket>();
  if (!ticket) notFound();

  const [{ data: events }, { data: org }, { data: ward }, { data: supporters }] = await Promise.all([
    supabase.from("ticket_events").select("*").eq("ticket_id", id).order("created_at"),
    ticket.org_id
      ? supabase.from("organizations").select("*").eq("id", ticket.org_id).maybeSingle<Organization>()
      : Promise.resolve({ data: null }),
    ticket.ward_id
      ? supabase.from("wards").select("name, code").eq("id", ticket.ward_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("ticket_support_count", { p_ticket: id }),
  ]);
  const supportCount = Number(supporters ?? 0);

  // Names of people on this ticket (the viewer can already see the ticket through RLS)
  const admin = createAdminClient();
  const peopleIds = [
    ...new Set([ticket.reporter_id, ticket.assigned_to, ...(events ?? []).map((e) => e.actor_id)].filter(Boolean)),
  ] as string[];
  const { data: people } = peopleIds.length
    ? await admin.from("profiles").select("id, full_name, platform_role").in("id", peopleIds)
    : { data: [] };
  const nameOf = (uid: string | null) => people?.find((p) => p.id === uid)?.full_name ?? "Someone";

  const caps = {
    reporter: ticket.reporter_id === viewer.userId,
    orgStaff: Boolean(
      ticket.org_id &&
        viewer.memberships.some((m) => m.org_id === ticket.org_id && m.status === "active" && m.role !== "member"),
    ),
    muni: viewer.profile.platform_role === "municipal_admin",
    assignee: ticket.assigned_to === viewer.userId,
  };

  let workers: { id: string; full_name: string; open: number }[] = [];
  if (caps.muni && ticket.scope === "municipal") {
    const { data: ws } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("platform_role", "worker")
      .eq("municipality_id", viewer.profile.municipality_id!);
    const { data: load } = await supabase
      .from("tickets")
      .select("assigned_to")
      .in("status", ["assigned", "in_progress"])
      .not("assigned_to", "is", null);
    workers = (ws ?? []).map((w) => ({
      ...w,
      open: load?.filter((l) => l.assigned_to === w.id).length ?? 0,
    }));
  }

  const photos = await signedUrls([ticket.photo_path, ticket.after_photo_path]);
  const before = ticket.photo_path ? photos.get(ticket.photo_path) : null;
  const after = ticket.after_photo_path ? photos.get(ticket.after_photo_path) : null;
  const overdue = isOverdue(ticket.sla_due_at, ticket.status);
  const tl = (events ?? []) as TicketEvent[];

  return (
    <>
      <LiveRefresh channel={`ticket-${id}`} filter={`id=eq.${id}`} />

      {isNew && (
        <div className="mb-6 flex animate-rise items-start gap-3 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
          <div className="text-sm">
            <div className="font-semibold text-ink">Submitted as {ticket.code}</div>
            <div className="text-slate">
              {ticket.scope === "internal" && org
                ? `The ${ORG_TYPE_META[org.type].admin.toLowerCase()} of ${org.name} has been notified.`
                : `Sent to the municipality${ward ? ` for ${ward.name}` : ""}.`}{" "}
              This page updates live.
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-medium text-ash">{ticket.code}</span>
            <Pill className="bg-mist text-slate ring-1 ring-bone ring-inset">
              {ticket.kind === "pickup" ? "Pickup request" : "Issue"}
            </Pill>
            <Pill
              className={
                ticket.scope === "municipal" ? "bg-violet/10 text-violet" : "bg-blue/10 text-blue"
              }
            >
              {ticket.scope === "municipal" ? "Municipality" : (org?.name ?? "Organization")}
            </Pill>
            {ticket.source !== "app" && (
              <Pill className="bg-mist text-slate">
                <QrCode className="h-3 w-3" /> {ticket.source === "guest" ? "Guest QR report" : "QR report"}
              </Pill>
            )}
            {supportCount > 0 && (
              <Pill className="bg-amber/10 text-amber">
                <Users className="h-3 w-3" /> +{supportCount} reported this too
              </Pill>
            )}
          </div>
          <h1 className="mt-2 font-display text-[24px] leading-tight font-bold tracking-[-0.035em] sm:text-[28px] md:text-heading-sm">
            {categoryText(locale, ticket.category)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
            <SeverityTag severity={ticket.severity} />
            <span>
              Reported {timeAgo(ticket.created_at)} by{" "}
              {caps.reporter ? "you" : ticket.source === "guest" ? "a visitor (no account)" : nameOf(ticket.reporter_id)}
            </span>
          </div>
        </div>
        <StatusPill status={ticket.status} className="self-start px-3 py-1 text-[13px]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {(before || after) && (
            <div className={cn("grid gap-3", after && "sm:grid-cols-2")}>
              {before && <Photo src={before} label="Reported" />}
              {after && <Photo src={after} label="After cleanup" tone="good" />}
            </div>
          )}

          {ticket.description && (
            <Card className="p-5">
              <div className="label-mono mb-2">Details</div>
              <p className="text-[15px] whitespace-pre-line text-ink">{ticket.description}</p>
            </Card>
          )}

          {ticket.ai && (
            <Card className="flex gap-3 p-5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
              <div className="text-sm">
                <div className="label-mono mb-1">AI triage · {Math.round((ticket.ai.confidence ?? 0) * 100)}% confident</div>
                <div className="text-ink">{ticket.ai.description}</div>
                {ticket.ai.waste_types?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ticket.ai.waste_types.map((w) => (
                      <Pill key={w} className="bg-mist text-slate">
                        {w.replace("_", "-")}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <TicketActions
            ticketId={ticket.id}
            status={ticket.status}
            scope={ticket.scope}
            kind={ticket.kind}
            overdue={overdue}
            scheduledFor={ticket.scheduled_for}
            assignedTo={ticket.assigned_to}
            caps={caps}
            workers={workers}
            userId={viewer.userId}
          />

          <Card>
            <CardHeader label="Timeline" title="What's happened" />
            <ol className="relative px-5 py-5">
              {tl.map((e, i) => {
                const meta = STATUS_META[e.to_status];
                const last = i === tl.length - 1;
                return (
                  <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {!last && <span className="absolute top-4 left-[7px] h-full w-px bg-bone" aria-hidden />}
                    <span className={cn("relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full ring-4 ring-card", meta.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold text-ink">
                          {e.from_status === null ? "Reported" : e.note?.startsWith("Escalated") || e.note?.startsWith("Forwarded") ? "Escalated to municipality" : meta.label}
                        </span>
                        <span className="text-sm text-slate">by {e.actor_id === viewer.userId ? "you" : nameOf(e.actor_id)}</span>
                      </div>
                      {e.note && e.from_status !== null && <p className="mt-1 text-sm text-slate">&ldquo;{e.note}&rdquo;</p>}
                      <div className="mt-1 font-mono text-[11px] text-ash">{formatDate(e.created_at, true)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <OverviewMap
              height={220}
              tickets={[{ id: ticket.id, code: ticket.code, lat: ticket.lat, lng: ticket.lng, status: ticket.status, label: categoryLabel(ticket.category) }]}
            />
            <dl className="divide-y divide-bone text-sm">
              <Row icon={<MapPin className="h-4 w-4" />} label="Location">
                {ticket.address || `${ticket.lat.toFixed(5)}, ${ticket.lng.toFixed(5)}`}
                {ticket.unit_label && <div className="text-slate">{ticket.unit_label}</div>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.lat},${ticket.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-blue px-3.5 text-[13px] font-semibold text-blue hover:bg-blue/5"
                >
                  <Navigation className="h-3.5 w-3.5" /> {t("Get directions")}
                </a>
              </Row>
              {org && (
                <Row icon={<Building2 className="h-4 w-4" />} label={ORG_TYPE_META[org.type].label}>
                  {org.name}
                </Row>
              )}
              {ward && (
                <Row icon={<MapPin className="h-4 w-4" />} label="Ward">
                  {ward.name} <span className="font-mono text-xs text-ash">({ward.code})</span>
                </Row>
              )}
              {ticket.preferred_date && (
                <Row icon={<CalendarDays className="h-4 w-4" />} label="Preferred pickup">
                  {formatDate(ticket.preferred_date)}
                </Row>
              )}
              {ticket.scheduled_for && (
                <Row icon={<CalendarCheck className="h-4 w-4" />} label={t("Collection date")}>
                  <span className="font-semibold">{formatDate(ticket.scheduled_for)}</span>
                </Row>
              )}
              {ticket.guest_contact && (caps.orgStaff || caps.muni) && (
                <Row icon={<Phone className="h-4 w-4" />} label="Visitor's contact">
                  {ticket.guest_contact}
                </Row>
              )}
              {ticket.assigned_to && (
                <Row icon={<ArrowUpRight className="h-4 w-4" />} label="Assigned to">
                  {nameOf(ticket.assigned_to)}
                </Row>
              )}
              {ticket.sla_due_at && !["closed", "rejected", "resolved"].includes(ticket.status) && (
                <Row icon={<Clock className="h-4 w-4" />} label="Resolve by">
                  <span className={cn(overdue && "font-semibold text-coral")}>
                    {formatDate(ticket.sla_due_at, true)} {overdue && "· overdue"}
                  </span>
                </Row>
              )}
              {ticket.resolved_at && (
                <Row icon={<CheckCircle2 className="h-4 w-4" />} label="Resolution time">
                  {formatHours(hoursBetween(ticket.created_at, ticket.resolved_at))}
                </Row>
              )}
              {ticket.rating && (
                <Row icon={<Star className="h-4 w-4" />} label="Reporter rating">
                  {"★".repeat(ticket.rating)}
                  <span className="text-cloud">{"★".repeat(5 - ticket.rating)}</span>
                </Row>
              )}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-3">
      <span className="mt-0.5 text-ash">{icon}</span>
      <div className="min-w-0">
        <dt className="label-mono">{label}</dt>
        <dd className="mt-0.5 text-ink">{children}</dd>
      </div>
    </div>
  );
}

function Photo({ src, label, tone }: { src: string; label: string; tone?: "good" }) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-bone bg-mist">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="aspect-[4/3] w-full object-cover" />
      <figcaption
        className={cn(
          "absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
          tone === "good" ? "bg-mint text-night" : "bg-white/95 text-ink",
        )}
      >
        {label}
      </figcaption>
    </figure>
  );
}
