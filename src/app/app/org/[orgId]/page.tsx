import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Clock, Copy, PartyPopper, Send, ShieldAlert, Truck, XCircle } from "lucide-react";
import { ButtonLink, Card, CardHeader, Pill, StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { TicketList } from "@/components/ticket-list";
import { NoticeList } from "@/components/notice-list";
import { LiveRefresh } from "@/components/live-refresh";
import { forwardPickupsAction } from "@/app/actions/tickets";
import { OPEN_STATUSES, ORG_TYPE_META } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import type { Notice } from "@/lib/types";
import { formatHours, hoursBetween, isOverdue } from "@/lib/utils";
import { loadOrg } from "./context";
import { CopyButton } from "./copy-button";

export const metadata: Metadata = { title: "Organization" };

export default async function OrgOverviewPage({ params, searchParams }: PageProps<"/app/org/[orgId]">) {
  const { orgId } = await params;
  const { welcome, registered } = (await searchParams) as { welcome?: string; registered?: string };
  const { viewer, supabase, org, membership, isStaff } = await loadOrg(orgId);
  const meta = ORG_TYPE_META[org.type];

  if (org.status !== "approved") {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        {org.status === "pending" ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber/15">
              <Clock className="h-6 w-6 text-amber" />
            </span>
            <h1 className="mt-5 font-display text-heading-sm font-bold">{org.name}</h1>
            <p className="mt-2 text-slate">
              {registered ? "Registration submitted. " : ""}The municipality for your ward is verifying this{" "}
              {meta.label.toLowerCase()}. You&apos;ll get admin tools as soon as it&apos;s approved.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral/10">
              <XCircle className="h-6 w-6 text-coral" />
            </span>
            <h1 className="mt-5 font-display text-heading-sm font-bold">Registration not approved</h1>
            <p className="mt-2 text-slate">{org.rejection_reason ?? "Contact your ward office for details."}</p>
            <ButtonLink href="/app/orgs/new" className="mt-6">
              Register again
            </ButtonLink>
          </>
        )}
      </div>
    );
  }

  const [{ data: ticketRows }, { data: notices }, { count: memberCount }, { count: pendingMembers }] = await Promise.all([
    isStaff
      ? supabase.from("tickets").select(TICKET_LIST_SELECT).eq("org_id", orgId).order("created_at", { ascending: false }).limit(300)
      : supabase
          .from("tickets")
          .select(TICKET_LIST_SELECT)
          .eq("org_id", orgId)
          .eq("reporter_id", viewer.userId)
          .order("created_at", { ascending: false })
          .limit(10),
    supabase.from("notices").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
  ]);
  const tickets = (ticketRows ?? []) as unknown as TicketListRow[];

  const welcomeBanner = welcome && (
    <div className="mb-6 flex animate-rise items-center gap-3 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4 text-sm">
      <PartyPopper className="h-5 w-5 text-emerald" />
      <span>
        You&apos;ve joined <b>{org.name}</b>. Report issues here and they go to your {meta.admin.toLowerCase()} first.
      </span>
    </div>
  );

  // ---------------- Member view ----------------
  if (!isStaff) {
    return (
      <>
        {welcomeBanner}
        <div className="mb-6 animate-rise">
          <div className="label-mono mb-2">
            {meta.label}
            {membership?.unit_label && ` · ${membership.unit_label}`}
          </div>
          <h1 className="font-display text-[30px] leading-tight font-bold tracking-[-0.04em] sm:text-heading">{org.name}</h1>
          <p className="mt-1 text-slate">{org.address}</p>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <ButtonLink href={`/app/report?org=${org.id}`} size="lg">
            <Camera className="h-4 w-4" /> Report an issue here
          </ButtonLink>
          {org.type !== "public_place" && (
            <ButtonLink href="/app/pickup" variant="secondary" size="lg">
              <Truck className="h-4 w-4" /> Request pickup
            </ButtonLink>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.02em]">Your reports here</h2>
            {tickets.length ? (
              <TicketList tickets={tickets} showOrg={false} />
            ) : (
              <Card className="p-6 text-sm text-slate">No reports yet. Anything you report inside {org.name} shows up here.</Card>
            )}
          </section>
          <Card>
            <CardHeader label="Notices" title={`From your ${meta.admin.toLowerCase()}`} />
            <NoticeList notices={(notices ?? []) as Notice[]} />
          </Card>
        </div>
      </>
    );
  }

  // ---------------- Admin / staff view ----------------
  const internalOpen = tickets.filter((t) => t.scope === "internal" && OPEN_STATUSES.includes(t.status));
  const pickupsPending = internalOpen.filter((t) => t.kind === "pickup" && ["submitted", "reopened"].includes(t.status));
  const issuesOpen = internalOpen.filter((t) => t.kind === "issue");
  const escalatedOpen = tickets.filter((t) => t.scope === "municipal" && OPEN_STATUSES.includes(t.status));
  const overdue = internalOpen.filter((t) => isOverdue(t.sla_due_at, t.status)).length;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const avgHours =
    resolved.length > 0
      ? resolved.reduce((s, t) => s + hoursBetween(t.created_at, t.updated_at), 0) / resolved.length
      : NaN;

  return (
    <>
      <LiveRefresh channel={`org-${orgId}`} filter={`org_id=eq.${orgId}`} />
      {welcomeBanner}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <div className="label-mono mb-2">{meta.label} · admin workspace</div>
          <h1 className="font-display text-[30px] leading-tight font-bold tracking-[-0.04em] sm:text-heading">{org.name}</h1>
          <p className="mt-1 text-slate">{org.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/app/org/${org.id}/notices`} variant="secondary">
            Post notice
          </ButtonLink>
          <ButtonLink href={`/app/org/${org.id}/members`}>Invite {meta.members.toLowerCase()}</ButtonLink>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open issues" value={issuesOpen.length} caption={overdue ? `${overdue} overdue` : "All within SLA"} tone={overdue ? "danger" : "default"} />
        <StatCard label="Pickup requests" value={pickupsPending.length} caption="Waiting to be forwarded" />
        <StatCard label="With municipality" value={escalatedOpen.length} caption="Escalated or municipal" />
        <StatCard label={meta.members} value={memberCount ?? 0} caption={pendingMembers ? `${pendingMembers} awaiting approval` : `Avg resolution ${formatHours(avgHours)}`} tone={pendingMembers ? "warn" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-6">
          {pickupsPending.length > 0 && (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10">
                  <Truck className="h-5 w-5 text-blue" />
                </span>
                <div>
                  <div className="font-display font-bold">{pickupsPending.length} pickup requests ready</div>
                  <div className="text-sm text-slate">
                    {Object.entries(
                      pickupsPending.reduce<Record<string, number>>((acc, t) => {
                        acc[t.category] = (acc[t.category] ?? 0) + 1;
                        return acc;
                      }, {}),
                    )
                      .map(([c, n]) => `${n} ${c.replace("_", "-")}`)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <form action={forwardPickupsAction}>
                <input type="hidden" name="org_id" value={org.id} />
                <SubmitButton pendingText="Forwarding…">
                  <Send className="h-4 w-4" /> Forward as one batch
                </SubmitButton>
              </form>
            </Card>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Needs attention</h2>
              <Link href={`/app/org/${org.id}/tickets`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
                All tickets <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {issuesOpen.length ? (
              <TicketList tickets={issuesOpen.slice(0, 8)} showOrg={false} />
            ) : (
              <Card className="p-6 text-sm text-slate">No open issues. Nice work.</Card>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader label="Invite code" title="Share with members" />
            <div className="p-5">
              <div className="flex items-center justify-between rounded-xl bg-mist px-4 py-3">
                <span className="font-mono text-2xl font-medium tracking-[0.3em] text-ink">{org.invite_code}</span>
                <CopyButton value={org.invite_code} icon={<Copy className="h-4 w-4" />} />
              </div>
              <p className="mt-3 text-xs text-ash">
                Members enter this under “Join or register”. You approve each request.
                {org.email_domain && ` Anyone with an @${org.email_domain} email joins automatically.`}
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader
              label="Escalated"
              title="With the municipality"
              action={escalatedOpen.length ? <Pill className="bg-violet/10 text-violet">{escalatedOpen.length}</Pill> : null}
            />
            {escalatedOpen.length ? (
              <TicketList tickets={escalatedOpen.slice(0, 5)} showOrg={false} className="rounded-none border-0" />
            ) : (
              <p className="px-5 py-5 text-sm text-ash">Nothing escalated right now.</p>
            )}
          </Card>
          <Card className="flex gap-3 p-5 text-sm text-slate">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
            Missed collections and illegal dumping go straight to the municipality. You&apos;ll still see them here.
          </Card>
        </aside>
      </div>
    </>
  );
}
