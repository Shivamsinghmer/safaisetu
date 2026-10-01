import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmails, type EmailContent, type OutgoingEmail } from "@/lib/email";
import { ORG_TYPE_META, STATUS_META, categoryLabel } from "@/lib/constants";
import type { OrgType, TicketStatus } from "@/lib/types";

/*
 * Email notifications for ticket and organization events.
 *
 * Called from server actions inside `after()`, so sending never slows the action down,
 * and every function swallows its own errors: a failed email must never break a report.
 * Recipients are looked up with the service-role client because they are usually people
 * the acting user cannot read (officers, workers, other residents).
 *
 * Every recipient also gets an in-app notification (the bell). Emails respect each
 * person's preferences: ticket/account updates (`email_updates`) and notices (`email_notices`).
 */

type Admin = ReturnType<typeof createAdminClient>;

interface TicketRow {
  id: string;
  code: string;
  kind: "issue" | "pickup";
  category: string;
  severity: "low" | "medium" | "high";
  status: TicketStatus;
  scope: "internal" | "municipal";
  org_id: string | null;
  ward_id: string | null;
  reporter_id: string | null;
  assigned_to: string | null;
  address: string | null;
  unit_label: string | null;
  rating: number | null;
  sla_due_at: string | null;
  scheduled_for: string | null;
  organizations: { name: string } | null;
  wards: { name: string; municipality_id: string } | null;
}

export interface TicketSnapshot {
  status: TicketStatus;
  scope: "internal" | "municipal";
  assigned_to: string | null;
  scheduled_for?: string | null;
}

const TICKET_SELECT =
  "id, code, kind, category, severity, status, scope, org_id, ward_id, reporter_id, assigned_to, address, unit_label, rating, sla_due_at, scheduled_for, organizations(name), wards(name, municipality_id)";

/* ------------------------------------------------------------------ */
/* Recipient lookups                                                    */
/* ------------------------------------------------------------------ */
interface Person {
  id: string;
  email: string | null;
  full_name: string;
  email_updates: boolean;
  email_notices: boolean;
}

async function people(db: Admin, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return [] as Person[];
  const { data } = await db
    .from("profiles")
    .select("id, email, full_name, email_updates, email_notices")
    .in("id", unique);
  return (data ?? []) as Person[];
}

/** People who pressed "me too" on a ticket: they follow it like the reporter. */
async function supporterIds(db: Admin, ticketId: string) {
  const { data } = await db
    .from("ticket_supporters")
    .select("user_id")
    .eq("ticket_id", ticketId);
  return ((data ?? []) as { user_id: string }[]).map((s) => s.user_id);
}

async function orgMemberIds(
  db: Admin,
  orgId: string,
  roles: ("admin" | "staff" | "member")[],
) {
  const { data } = await db
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("role", roles);
  return ((data ?? []) as { user_id: string }[]).map((m) => m.user_id);
}

async function officerIds(
  db: Admin,
  municipalityId: string | null | undefined,
) {
  if (!municipalityId) return [];
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("platform_role", "municipal_admin")
    .eq("municipality_id", municipalityId);
  return ((data ?? []) as { id: string }[]).map((p) => p.id);
}

async function wardMunicipality(db: Admin, wardId: string | null | undefined) {
  if (!wardId) return null;
  const { data } = await db
    .from("wards")
    .select("municipality_id")
    .eq("id", wardId)
    .maybeSingle();
  return (data as { municipality_id: string } | null)?.municipality_id ?? null;
}

/** Who acts on a ticket right now: the org's admins and staff, or the city's officers. */
async function handlerIds(db: Admin, t: TicketRow) {
  return t.scope === "internal" && t.org_id
    ? orgMemberIds(db, t.org_id, ["admin", "staff"])
    : officerIds(db, t.wards?.municipality_id);
}

/**
 * Collects one email per person per event. The first message queued for someone wins,
 * and the person who triggered the event is never emailed about their own action.
 */
type Kind = "update" | "notice";

function outbox(actorId: string | null, base: string) {
  const queued = new Map<string, { content: EmailContent; kind: Kind }>();
  return {
    add(
      ids: (string | null | undefined)[],
      content: EmailContent,
      kind: Kind = "update",
    ) {
      for (const id of ids)
        if (id && id !== actorId && !queued.has(id))
          queued.set(id, { content, kind });
    },
    async flush(db: Admin) {
      if (!queued.size) return;
      const recipients = await people(db, [...queued.keys()]);

      // In-app notifications for everyone, whatever their email settings
      const rows = recipients.map((p) => {
        const { content } = queued.get(p.id)!;
        const url = content.cta?.url;
        return {
          user_id: p.id,
          title: content.subject,
          body: content.body[0] ?? "",
          url:
            url && url.startsWith(base)
              ? url.slice(base.length) || "/app"
              : null,
        };
      });
      if (rows.length) {
        const { error } = await db.from("notifications").insert(rows);
        if (error)
          console.error("[notify] in-app insert failed:", error.message);
      }

      const emails: OutgoingEmail[] = recipients
        .filter((p) => {
          const { kind } = queued.get(p.id)!;
          return (
            Boolean(p.email) &&
            (kind === "notice" ? p.email_notices : p.email_updates)
          );
        })
        .map((p) => {
          const { content } = queued.get(p.id)!;
          const footer =
            content.footer ??
            "You're getting this because of your activity on SafaiSetu.";
          return {
            to: p.email!,
            ...content,
            footer: `${footer} Manage emails: ${base}/app/settings`,
          };
        });
      await sendEmails(emails);
    },
  };
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(
      `[notify] ${label} failed:`,
      e instanceof Error ? e.message : e,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Ticket helpers                                                       */
/* ------------------------------------------------------------------ */
async function loadTicket(db: Admin, id: string) {
  const { data } = await db
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as TicketRow | null;
}

function what(t: TicketRow) {
  return t.kind === "pickup"
    ? `${categoryLabel(t.category)} pickup`
    : categoryLabel(t.category);
}

function where(t: TicketRow) {
  return (
    [t.organizations?.name, t.unit_label, t.wards?.name, t.address]
      .filter(Boolean)
      .join(" · ") || "Location on the map"
  );
}

function ticketDetails(t: TicketRow): [string, string][] {
  const rows: [string, string][] = [
    ["Ticket", t.code],
    ["Type", what(t)],
    ["Where", where(t)],
    ["Status", STATUS_META[t.status].label],
  ];
  if (t.kind === "issue")
    rows.splice(2, 0, [
      "Severity",
      t.severity[0]!.toUpperCase() + t.severity.slice(1),
    ]);
  if (t.scheduled_for)
    rows.push([
      "Collection date",
      new Date(`${t.scheduled_for}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    ]);
  if (t.sla_due_at && !["resolved", "closed", "rejected"].includes(t.status))
    rows.push([
      "Due by",
      new Date(t.sla_due_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }),
    ]);
  return rows;
}

function handledBy(t: TicketRow) {
  return t.scope === "internal" && t.organizations
    ? `the team at ${t.organizations.name}`
    : `the municipality${t.wards ? ` (${t.wards.name})` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Ticket events                                                        */
/* ------------------------------------------------------------------ */

/** A new report or pickup request: confirm to the reporter, alert whoever handles it. */
export async function notifyTicketCreated(ticketId: string, base: string) {
  await safely("ticket created", async () => {
    const db = createAdminClient();
    const t = await loadTicket(db, ticketId);
    if (!t) return;
    const link = { label: "Open ticket", url: `${base}/app/tickets/${t.id}` };
    const box = outbox(null, base);

    box.add([t.reporter_id], {
      subject: `We got your report · ${t.code}`,
      heading: `Your ${what(t).toLowerCase()} report is in`,
      body: [
        `It has been sent to ${handledBy(t)}. We'll email you at every step until it's resolved.`,
      ],
      details: ticketDetails(t),
      cta: link,
    });

    const handlers = (await handlerIds(db, t)).filter(
      (id) => id !== t.reporter_id,
    );
    box.add(handlers, {
      subject: `New ${t.kind === "pickup" ? "pickup request" : "complaint"}: ${what(t)} · ${t.code}`,
      heading: `New ${t.kind === "pickup" ? "pickup request" : "complaint"} to handle`,
      body: [
        t.scope === "internal"
          ? `A member of ${t.organizations?.name ?? "your organization"} reported this. It's in your tickets now.`
          : "A new report has come into your ward's queue.",
      ],
      details: ticketDetails(t),
      cta: link,
    });
    await box.flush(db);
  });
}

/**
 * Anything that changed on a ticket: status, assignment or escalation.
 * `before` is the ticket as it was just before the update.
 * `batch` skips the per-ticket officer email when pickups are forwarded together.
 */
export async function notifyTicketUpdated(opts: {
  ticketId: string;
  before: TicketSnapshot;
  actorId: string;
  note: string | null;
  base: string;
  batch?: boolean;
}) {
  await safely("ticket updated", async () => {
    const db = createAdminClient();
    const t = await loadTicket(db, opts.ticketId);
    if (!t) return;
    const { before, note } = opts;
    const link = {
      label: "Open ticket",
      url: `${opts.base}/app/tickets/${t.id}`,
    };
    const box = outbox(opts.actorId, opts.base);
    const [actor] = await people(db, [opts.actorId]);
    const actorName = actor?.full_name || "The team";
    const quote = note ? { by: actorName, text: note } : undefined;
    const details = ticketDetails(t);
    // The reporter and everyone who pressed "me too" follow the ticket
    const followers = [t.reporter_id, ...(await supporterIds(db, t.id))];

    // Escalated from the organization to the city
    if (before.scope === "internal" && t.scope === "municipal") {
      box.add(followers, {
        subject: `${t.code} was sent to the municipality`,
        heading: "Your report has gone to the city",
        body: [
          opts.actorId === t.reporter_id
            ? "You escalated it because the deadline passed. The municipality will assign a field worker."
            : `${t.organizations?.name ?? "Your organization"} has passed it to the municipality, who will assign a field worker.`,
        ],
        details,
        quote,
        cta: link,
      });
      if (!opts.batch) {
        box.add(await officerIds(db, t.wards?.municipality_id), {
          subject: `Escalated: ${what(t)} · ${t.code}`,
          heading: `${t.organizations?.name ?? "An organization"} escalated a ticket`,
          body: [
            "It needs a field worker from the city. Assign one from the complaint queue.",
          ],
          details,
          quote,
          cta: { label: "Assign a worker", url: link.url },
        });
      }
    }

    // A worker was (re)assigned
    if (t.assigned_to && t.assigned_to !== before.assigned_to) {
      box.add([t.assigned_to], {
        subject: `New task: ${what(t)} · ${t.code}`,
        heading: "You have a new task",
        body: [
          "Go to the pin, clean up, and upload an after photo as proof when you're done.",
        ],
        details,
        quote,
        cta: { label: "Open task", url: link.url },
      });
    }

    // A collection date was set or changed for a pickup
    if (t.scheduled_for && t.scheduled_for !== (before.scheduled_for ?? null)) {
      box.add(followers, {
        subject: `Pickup scheduled · ${t.code}`,
        heading: "Your pickup has a date",
        body: [
          "Keep the items ready at the pickup point on the collection date below.",
        ],
        details,
        quote,
        cta: link,
      });
    }

    if (t.status !== before.status) {
      // The reporter hears about every step they didn't take themselves
      const forReporter: Partial<
        Record<
          TicketStatus,
          Pick<EmailContent, "subject" | "heading" | "body"> & { cta?: string }
        >
      > = {
        assigned: {
          subject: `A worker is assigned to ${t.code}`,
          heading: "A field worker is on it",
          body: [
            "Your report has been assigned to a field worker. You'll hear from us when work starts.",
          ],
        },
        in_progress: {
          subject: `Work has started on ${t.code}`,
          heading: "Clean-up has started",
          body: [
            `${handledBy(t)[0]!.toUpperCase()}${handledBy(t).slice(1)} is working on your report now.`,
          ],
        },
        resolved: {
          subject: `${t.code} is resolved: please check`,
          heading: "Marked as resolved. Is it clean?",
          body: [
            "Compare the before and after photos. Close the ticket with a rating, or reopen it if the problem is still there.",
          ],
          cta: "Check and close",
        },
        rejected: {
          subject: `${t.code} was not accepted`,
          heading: "Your report was closed without action",
          body: [
            "The team decided this report doesn't need action. The reason is below.",
          ],
        },
        closed: {
          subject: `${t.code} is closed`,
          heading: "Ticket closed",
          body: [
            "This ticket is closed. Thank you for helping keep your area clean.",
          ],
        },
      };
      const r = forReporter[t.status];
      if (r)
        box.add(followers, {
          ...r,
          details,
          quote,
          cta: { label: r.cta ?? link.label, url: link.url },
        });

      // Reopened: the worker and whoever handles the ticket need to act again
      if (t.status === "reopened") {
        box.add([t.assigned_to, ...(await handlerIds(db, t))], {
          subject: `Reopened: ${what(t)} · ${t.code}`,
          heading: "The citizen says it's still not clean",
          body: ["This ticket was reopened and has a new 24-hour deadline."],
          details,
          quote,
          cta: link,
        });
      }

      // Closed by the citizen: tell the worker how it went
      if (t.status === "closed") {
        box.add([t.assigned_to], {
          subject: `${t.code} closed${t.rating ? ` · rated ${t.rating}/5` : ""}`,
          heading: "The citizen confirmed your clean-up",
          body: [
            t.rating
              ? `They rated the work ${t.rating} out of 5. Good job.`
              : "The ticket is now closed.",
          ],
          details,
          cta: link,
        });
      }

      // Resolved by an org's staff: keep the other admins in the loop
      if (t.status === "resolved" && t.scope === "internal") {
        box.add(await handlerIds(db, t), {
          subject: `Resolved: ${what(t)} · ${t.code}`,
          heading: `${actorName} resolved a ticket`,
          body: ["Waiting for the reporter to confirm."],
          details,
          cta: link,
        });
      }
    }

    await box.flush(db);
  });
}

/** One summary email to the city's officers when an organization forwards pickups together. */
export async function notifyPickupBatch(
  orgId: string,
  count: number,
  actorId: string,
  baseUrl: string,
) {
  if (!count) return;
  await safely("pickup batch", async () => {
    const db = createAdminClient();
    const { data } = await db
      .from("organizations")
      .select("name, ward_id")
      .eq("id", orgId)
      .maybeSingle();
    const org = data as { name: string; ward_id: string | null } | null;
    if (!org) return;
    const box = outbox(actorId, baseUrl);
    box.add(await officerIds(db, await wardMunicipality(db, org.ward_id)), {
      subject: `${org.name} forwarded ${count} pickup request${count === 1 ? "" : "s"}`,
      heading: `${count} pickup request${count === 1 ? "" : "s"} from ${org.name}`,
      body: [
        "They were sent together so one crew can collect everything in a single trip. They're in the Pickups tab of your queue.",
      ],
      cta: { label: "Open pickups", url: `${baseUrl}/app/muni/tickets` },
    });
    await box.flush(db);
  });
}

/* ------------------------------------------------------------------ */
/* Organization events                                                  */
/* ------------------------------------------------------------------ */
interface OrgRow {
  id: string;
  name: string;
  type: OrgType;
  address: string;
  ward_id: string | null;
  created_by: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  invite_code: string;
}

async function loadOrg(db: Admin, id: string) {
  const { data } = await db
    .from("organizations")
    .select(
      "id, name, type, address, ward_id, created_by, status, rejection_reason, invite_code",
    )
    .eq("id", id)
    .maybeSingle();
  return data as OrgRow | null;
}

/** A new society, campus or public place is waiting for verification. */
export async function notifyOrgRegistered(
  orgId: string,
  actorId: string,
  baseUrl: string,
) {
  await safely("org registered", async () => {
    const db = createAdminClient();
    const org = await loadOrg(db, orgId);
    if (!org) return;
    const box = outbox(actorId, baseUrl);
    const [registrant] = await people(db, [org.created_by]);
    box.add(await officerIds(db, await wardMunicipality(db, org.ward_id)), {
      subject: `New ${ORG_TYPE_META[org.type].label.toLowerCase()} to verify: ${org.name}`,
      heading: `${org.name} is waiting for approval`,
      body: [
        "Check the proof document, then approve or reject the registration.",
      ],
      details: [
        ["Type", ORG_TYPE_META[org.type].label],
        ["Address", org.address],
        ["Registered by", registrant?.full_name || "Unknown"],
      ],
      cta: { label: "Review registration", url: `${baseUrl}/app/muni/orgs` },
    });
    await box.flush(db);
  });
}

/** The municipality approved or rejected a registration. */
export async function notifyOrgReviewed(
  orgId: string,
  actorId: string,
  baseUrl: string,
) {
  await safely("org reviewed", async () => {
    const db = createAdminClient();
    const org = await loadOrg(db, orgId);
    if (!org || org.status === "pending") return;
    const box = outbox(actorId, baseUrl);
    box.add(
      [org.created_by],
      org.status === "approved"
        ? {
            subject: `${org.name} is approved on SafaiSetu`,
            heading: `${org.name} is live`,
            body: [
              `The municipality verified your ${ORG_TYPE_META[org.type].label.toLowerCase()}. You can now invite ${ORG_TYPE_META[org.type].members.toLowerCase()}, post notices and handle complaints.`,
            ],
            details: [["Invite code", org.invite_code]],
            cta: {
              label: "Invite members",
              url: `${baseUrl}/app/org/${org.id}/members`,
            },
          }
        : {
            subject: `${org.name} was not approved`,
            heading: "Your registration was not approved",
            body: [
              "The municipality couldn't verify this registration. You can register again with a clearer proof document.",
            ],
            quote: org.rejection_reason
              ? { by: "Municipality", text: org.rejection_reason }
              : undefined,
            cta: { label: "Register again", url: `${baseUrl}/app/orgs/new` },
          },
    );
    await box.flush(db);
  });
}

/** Someone asked to join with the invite code: the admins must approve them. */
export async function notifyJoinRequest(
  orgId: string,
  userId: string,
  baseUrl: string,
) {
  await safely("join request", async () => {
    const db = createAdminClient();
    const org = await loadOrg(db, orgId);
    if (!org) return;
    const [person] = await people(db, [userId]);
    const box = outbox(userId, baseUrl);
    box.add(await orgMemberIds(db, orgId, ["admin"]), {
      subject: `${person?.full_name || "Someone"} wants to join ${org.name}`,
      heading: "New join request",
      body: [
        `${person?.full_name || "A user"} used your invite code to join ${org.name}. Approve them if they belong here.`,
      ],
      details: person?.email ? [["Email", person.email]] : undefined,
      cta: {
        label: "Review request",
        url: `${baseUrl}/app/org/${org.id}/members`,
      },
    });
    await box.flush(db);
  });
}

/** An admin approved a pending member. */
export async function notifyMemberApproved(
  membershipId: string,
  actorId: string,
  baseUrl: string,
) {
  await safely("member approved", async () => {
    const db = createAdminClient();
    const { data } = await db
      .from("memberships")
      .select("user_id, org_id, status")
      .eq("id", membershipId)
      .maybeSingle();
    const m = data as {
      user_id: string;
      org_id: string;
      status: string;
    } | null;
    if (!m || m.status !== "active") return;
    const org = await loadOrg(db, m.org_id);
    if (!org) return;
    const box = outbox(actorId, baseUrl);
    box.add([m.user_id], {
      subject: `You're now a member of ${org.name}`,
      heading: `Welcome to ${org.name}`,
      body: [
        "Your request was approved. You can now report issues inside it, request pickups and read its notices.",
      ],
      cta: { label: "Open SafaiSetu", url: `${baseUrl}/app/org/${org.id}` },
    });
    await box.flush(db);
  });
}

/** A notice: an org's members get its notices; a city notice goes to the org admins in its wards. */
export async function notifyNotice(
  noticeId: string,
  actorId: string,
  baseUrl: string,
) {
  await safely("notice", async () => {
    const db = createAdminClient();
    const { data } = await db
      .from("notices")
      .select("title, body, org_id, municipality_id")
      .eq("id", noticeId)
      .maybeSingle();
    const n = data as {
      title: string;
      body: string;
      org_id: string | null;
      municipality_id: string | null;
    } | null;
    if (!n) return;
    const box = outbox(actorId, baseUrl);

    if (n.org_id) {
      const org = await loadOrg(db, n.org_id);
      box.add(
        await orgMemberIds(db, n.org_id, ["admin", "staff", "member"]),
        {
          subject: `Notice from ${org?.name ?? "your organization"}: ${n.title}`,
          heading: n.title,
          body: n.body.split(/\n{2,}/),
          footer: `You're getting this because you're a member of ${org?.name ?? "this organization"} on SafaiSetu.`,
          cta: { label: "Open SafaiSetu", url: `${baseUrl}/app/home` },
        },
        "notice",
      );
    } else if (n.municipality_id) {
      const { data: wards } = await db
        .from("wards")
        .select("id")
        .eq("municipality_id", n.municipality_id);
      const wardIds = ((wards ?? []) as { id: string }[]).map((w) => w.id);
      const { data: orgs } = wardIds.length
        ? await db
            .from("organizations")
            .select("id")
            .in("ward_id", wardIds)
            .eq("status", "approved")
        : { data: [] };
      const orgIds = ((orgs ?? []) as { id: string }[]).map((o) => o.id);
      const { data: admins } = orgIds.length
        ? await db
            .from("memberships")
            .select("user_id")
            .in("org_id", orgIds)
            .eq("role", "admin")
            .eq("status", "active")
        : { data: [] };
      box.add(
        ((admins ?? []) as { user_id: string }[]).map((a) => a.user_id),
        {
          subject: `City notice: ${n.title}`,
          heading: n.title,
          body: [
            ...n.body.split(/\n{2,}/),
            "Please share this with your members if it affects them.",
          ],
          footer:
            "You're getting this because you manage an organization on SafaiSetu.",
          cta: { label: "Open SafaiSetu", url: `${baseUrl}/app/home` },
        },
        "notice",
      );
    }
    await box.flush(db);
  });
}
