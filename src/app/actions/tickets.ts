"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireViewer } from "@/lib/session";
import { LIMITS, TOO_MANY, allow, clientIp } from "@/lib/rate-limit";
import { PHOTO_BUCKET } from "@/lib/storage";
import { notifyPickupBatch, notifyTicketCreated, notifyTicketUpdated, type TicketSnapshot } from "@/lib/notify";
import { publicSiteUrl } from "@/lib/site-url";
import type { ActionState, TicketStatus } from "@/lib/types";

const aiSchema = z
  .object({
    is_waste: z.boolean(),
    category: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    waste_types: z.array(z.string()),
    description: z.string(),
    confidence: z.number(),
  })
  .nullable();

const ticketSchema = z.object({
  kind: z.enum(["issue", "pickup"]),
  category: z.string().min(2, "Choose a category").max(40),
  description: z.string().trim().max(1000).default(""),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  lat: z.coerce.number({ error: "Set the location on the map" }).min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  org_id: z.uuid().optional(),
  qr_point_id: z.uuid().optional(),
  unit_label: z.string().trim().max(60).optional(),
  photo_path: z.string().max(300).optional(),
  preferred_date: z.iso.date().optional(),
  ai: z.string().optional(),
});

export async function createTicketAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = ticketSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const input = parsed.data;

  if (input.kind === "issue" && !input.photo_path) return { error: "Add a photo of the problem" };
  if (input.photo_path && !input.photo_path.startsWith(`${viewer.userId}/`)) return { error: "Invalid photo" };
  if (input.kind === "pickup" && !input.preferred_date) return { error: "Pick a preferred date" };
  if (!(await allow(`report:${viewer.userId}`, LIMITS.report.max, LIMITS.report.window))) return { error: TOO_MANY };

  let ai = null;
  if (input.ai) {
    try {
      ai = aiSchema.parse(JSON.parse(input.ai));
    } catch {
      ai = null;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      kind: input.kind,
      category: input.category,
      description: input.description,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      address: input.address ?? null,
      org_id: input.org_id ?? null,
      qr_point_id: input.qr_point_id ?? null,
      unit_label: input.unit_label ?? null,
      photo_path: input.photo_path ?? null,
      preferred_date: input.preferred_date ?? null,
      source: input.qr_point_id ? "qr" : "app",
      ai,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const base = await publicSiteUrl();
  after(() => notifyTicketCreated(data.id, base));

  revalidatePath("/app", "layout");
  redirect(`/app/tickets/${data.id}?new=1`);
}

export async function updateTicketAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const ticketId = String(formData.get("ticket_id"));
  const status = (formData.get("status") as TicketStatus | null) || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const assignedTo = (formData.get("assigned_to") as string | null) || null;
  const afterPhoto = (formData.get("after_photo_path") as string | null) || null;
  const escalate = formData.get("escalate") === "1";
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;
  const scheduledRaw = String(formData.get("scheduled_for") ?? "");
  const scheduledFor = /^\d{4}-\d{2}-\d{2}$/.test(scheduledRaw) ? scheduledRaw : null;

  if (afterPhoto && !afterPhoto.startsWith(`${viewer.userId}/`)) return { error: "Invalid photo" };
  if (status === "reopened" && !note) return { error: "Tell the team what's still wrong" };
  if (status === "assigned" && !assignedTo) return { error: "Choose a worker to assign" };
  // The database enforces this too; checking here gives a clearer message first
  if (status === "resolved" && !afterPhoto) return { error: "Upload an after photo as proof of cleanup" };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("tickets")
    .select("status, scope, assigned_to, scheduled_for")
    .eq("id", ticketId)
    .maybeSingle<TicketSnapshot>();
  const { error } = await supabase.rpc("update_ticket", {
    p_ticket: ticketId,
    p_status: escalate ? null : status,
    p_note: note,
    p_assigned_to: assignedTo,
    p_after_photo: afterPhoto,
    p_escalate: escalate,
    p_rating: rating,
    p_scheduled_for: scheduledFor,
  });
  if (error) return { error: error.message };

  if (before) {
    const base = await publicSiteUrl();
    after(() => notifyTicketUpdated({ ticketId, before, actorId: viewer.userId, note, base }));
  }

  revalidatePath("/app", "layout");
  return { ok: true, message: "Updated." };
}

/** Org admin: send all pending pickup requests to the municipality as one batch */
export async function forwardPickupsAction(formData: FormData) {
  const viewer = await requireViewer();
  const orgId = String(formData.get("org_id"));
  const supabase = await createClient();
  const { data: pickups } = await supabase
    .from("tickets")
    .select("id, status, scope, assigned_to, scheduled_for")
    .eq("org_id", orgId)
    .eq("kind", "pickup")
    .eq("scope", "internal")
    .in("status", ["submitted", "reopened"]);
  const count = pickups?.length ?? 0;
  const note = `Forwarded in a batch of ${count} pickup request${count === 1 ? "" : "s"}`;
  const forwarded: (TicketSnapshot & { id: string })[] = [];
  for (const p of pickups ?? []) {
    const { error } = await supabase.rpc("update_ticket", { p_ticket: p.id, p_escalate: true, p_note: note });
    if (!error) forwarded.push(p as TicketSnapshot & { id: string });
  }

  // Each resident hears about their own pickup; the city gets one summary, not one email per pickup
  const base = await publicSiteUrl();
  after(async () => {
    for (const p of forwarded) {
      await notifyTicketUpdated({ ticketId: p.id, before: p, actorId: viewer.userId, note, base, batch: true });
    }
    await notifyPickupBatch(orgId, forwarded.length, viewer.userId, base);
  });
  revalidatePath("/app", "layout");
}

/* ------------------------------------------------------------------ */
/* Duplicates: nearby open reports and "me too"                         */
/* ------------------------------------------------------------------ */
export interface NearbyTicket {
  id: string;
  code: string;
  category: string;
  status: TicketStatus;
  created_at: string;
  distance_m: number;
  supporters: number;
  mine: boolean;
}

/** Open reports within ~80 m of a spot that this person can see and support. */
export async function findNearbyAction(lat: number, lng: number, kind: "issue" | "pickup" = "issue") {
  await requireViewer();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [] as NearbyTicket[];
  const supabase = await createClient();
  const { data } = await supabase.rpc("nearby_open_tickets", { p_lat: lat, p_lng: lng, p_kind: kind });
  return (data ?? []) as NearbyTicket[];
}

/** Add your voice to an existing report instead of filing a duplicate. */
export async function supportTicketAction(ticketId: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const viewer = await requireViewer();
  if (!(await allow(`support:${viewer.userId}`, LIMITS.support.max, LIMITS.support.window))) return { ok: false, error: TOO_MANY };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("support_ticket", { p_ticket: ticketId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, count: Number(data) };
}

/* ------------------------------------------------------------------ */
/* Guest reports from a QR code (no account)                            */
/* ------------------------------------------------------------------ */
const guestSchema = z.object({
  qr_point_id: z.uuid(),
  category: z.string().min(2, "Choose what's wrong").max(40),
  description: z.string().trim().max(500).default(""),
  contact: z.string().trim().max(80).optional(),
  photo: z.string().startsWith("data:image/jpeg;base64,", "Add a photo of the problem").max(2_000_000, "Photo is too large"),
});

export async function createGuestReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = guestSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const input = parsed.data;

  const ip = await clientIp();
  if (!(await allow(`guest:${ip}`, LIMITS.guestReport.max, LIMITS.guestReport.window))) return { error: TOO_MANY };

  const db = createAdminClient();
  const { data: qr } = await db
    .from("qr_points")
    .select("id, label, lat, lng, org_id, organizations!inner(status)")
    .eq("id", input.qr_point_id)
    .eq("organizations.status", "approved")
    .maybeSingle();
  if (!qr) return { error: "This QR code is no longer active." };

  // Store the photo in the private bucket under a guest folder
  const bytes = Buffer.from(input.photo.slice("data:image/jpeg;base64,".length), "base64");
  const path = `guest/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await db.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: "image/jpeg" });
  if (upErr) return { error: "Couldn't upload the photo. Try again." };

  const { data, error } = await db
    .from("tickets")
    .insert({
      kind: "issue",
      category: input.category,
      description: input.description,
      severity: "medium",
      lat: qr.lat,
      lng: qr.lng,
      address: qr.label,
      org_id: qr.org_id,
      qr_point_id: qr.id,
      photo_path: path,
      source: "guest",
      guest_contact: input.contact || null,
    })
    .select("id, public_token")
    .single();
  if (error) return { error: error.message };

  const base = await publicSiteUrl();
  after(() => notifyTicketCreated(data.id, base));
  redirect(`/track/${data.public_token}?new=1`);
}
