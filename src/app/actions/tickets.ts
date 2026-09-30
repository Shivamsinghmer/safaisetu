"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/session";
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

  if (afterPhoto && !afterPhoto.startsWith(`${viewer.userId}/`)) return { error: "Invalid photo" };
  if (status === "reopened" && !note) return { error: "Tell the team what's still wrong" };
  if (status === "assigned" && !assignedTo) return { error: "Choose a worker to assign" };
  if (status === "resolved" && formData.get("require_photo") === "1" && !afterPhoto)
    return { error: "Upload an after photo as proof of cleanup" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_ticket", {
    p_ticket: ticketId,
    p_status: escalate ? null : status,
    p_note: note,
    p_assigned_to: assignedTo,
    p_after_photo: afterPhoto,
    p_escalate: escalate,
    p_rating: rating,
  });
  if (error) return { error: error.message };

  revalidatePath("/app", "layout");
  return { ok: true, message: "Updated." };
}

/** Org admin: send all pending pickup requests to the municipality as one batch */
export async function forwardPickupsAction(formData: FormData) {
  await requireViewer();
  const orgId = String(formData.get("org_id"));
  const supabase = await createClient();
  const { data: pickups } = await supabase
    .from("tickets")
    .select("id")
    .eq("org_id", orgId)
    .eq("kind", "pickup")
    .eq("scope", "internal")
    .in("status", ["submitted", "reopened"]);
  const count = pickups?.length ?? 0;
  for (const p of pickups ?? []) {
    await supabase.rpc("update_ticket", {
      p_ticket: p.id,
      p_escalate: true,
      p_note: `Forwarded in a batch of ${count} pickup request${count === 1 ? "" : "s"}`,
    });
  }
  revalidatePath("/app", "layout");
}
