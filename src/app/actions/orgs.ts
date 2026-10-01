"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireViewer } from "@/lib/session";
import { sendInviteEmail } from "@/lib/email";
import { ORG_TYPE_META } from "@/lib/constants";
import { publicSiteUrl } from "@/lib/site-url";
import { LIMITS, TOO_MANY, allow } from "@/lib/rate-limit";
import { notifyJoinRequest, notifyMemberApproved, notifyNotice, notifyOrgRegistered, notifyOrgReviewed } from "@/lib/notify";
import type { ActionState, OrgType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Registration & review                                                */
/* ------------------------------------------------------------------ */
const registerSchema = z.object({
  type: z.enum(["society", "college", "public_place"]),
  name: z.string().trim().min(2, "Enter the organization name").max(120),
  address: z.string().trim().min(5, "Enter the full address"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  reg_number: z.string().trim().max(60).optional(),
  unit_count: z.coerce.number().int().min(0).max(100000).optional(),
  email_domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^@?[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain like xyz.edu.in")
    .optional()
    .or(z.literal("")),
  proof_path: z.string({ error: "Upload a proof document (registration certificate or authorisation letter)" }).min(1).max(300),
});

export async function registerOrgAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""),
  );
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const input = parsed.data;
  if (!input.proof_path.startsWith(`${viewer.userId}/`)) return { error: "Invalid document" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      type: input.type,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      reg_number: input.reg_number || null,
      unit_count: input.unit_count ?? null,
      email_domain: input.type === "college" ? input.email_domain || null : null,
      proof_path: input.proof_path,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const base = await publicSiteUrl();
  after(() => notifyOrgRegistered(data.id, viewer.userId, base));
  revalidatePath("/app", "layout");
  redirect(`/app/org/${data.id}?registered=1`);
}

export async function reviewOrgAction(formData: FormData) {
  const viewer = await requireViewer();
  const orgId = String(formData.get("org_id"));
  const decision = formData.get("decision") === "approve" ? "approved" : "rejected";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ status: decision, rejection_reason: decision === "rejected" ? reason : null })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
  const base = await publicSiteUrl();
  after(() => notifyOrgReviewed(orgId, viewer.userId, base));
  revalidatePath("/app", "layout");
}

/* ------------------------------------------------------------------ */
/* Joining                                                              */
/* ------------------------------------------------------------------ */
export async function joinByCodeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const unit = String(formData.get("unit_label") ?? "").trim().slice(0, 60) || null;
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: "Invite codes are 6 letters/numbers" };

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, type, email_domain")
    .eq("invite_code", code)
    .eq("status", "approved")
    .maybeSingle();
  if (!org) return { error: "No approved organization uses that code" };

  const existing = viewer.memberships.find((m) => m.org_id === org.id);
  if (existing?.status === "active") redirect(`/app/org/${org.id}`);
  if (existing?.status === "pending") return { message: `Your request to join ${org.name} is awaiting approval.` };

  const domainMatch = org.email_domain && viewer.email.toLowerCase().endsWith(`@${org.email_domain}`);
  const status = domainMatch ? "active" : "pending";
  const { error } = await admin
    .from("memberships")
    .upsert({ org_id: org.id, user_id: viewer.userId, role: "member", status, unit_label: unit }, { onConflict: "org_id,user_id" });
  if (error) return { error: error.message };

  if (status === "pending") {
    const base = await publicSiteUrl();
    after(() => notifyJoinRequest(org.id, viewer.userId, base));
  }
  revalidatePath("/app", "layout");
  if (status === "active") redirect(`/app/org/${org.id}?welcome=1`);
  return { message: `Request sent. The ${ORG_TYPE_META[org.type as OrgType].admin.toLowerCase()} of ${org.name} will approve it.` };
}

export async function acceptInviteAction(formData: FormData) {
  const viewer = await requireViewer();
  const token = String(formData.get("token") ?? "");
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!invite) redirect(`/invite/${token}?error=invalid`);
  if (invite.email.toLowerCase() !== viewer.email.toLowerCase()) redirect(`/invite/${token}?error=email`);

  const { error } = await admin.from("memberships").upsert(
    { org_id: invite.org_id, user_id: viewer.userId, role: "member", status: "active", unit_label: invite.unit_label },
    { onConflict: "org_id,user_id" },
  );
  if (error) redirect(`/invite/${token}?error=failed`);
  await admin.from("invitations").update({ status: "accepted" }).eq("id", invite.id);
  revalidatePath("/app", "layout");
  redirect(`/app/org/${invite.org_id}?welcome=1`);
}

/* ------------------------------------------------------------------ */
/* Member management (org admin)                                        */
/* ------------------------------------------------------------------ */
export async function inviteMembersAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const orgId = String(formData.get("org_id"));
  const lines = String(formData.get("emails") ?? "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { error: "Add at least one email" };
  if (lines.length > 200) return { error: "Invite at most 200 people at a time" };
  if (!(await allow(`invite:${viewer.userId}`, LIMITS.invite.max, LIMITS.invite.window))) return { error: TOO_MANY };

  const rows: { email: string; unit_label: string | null }[] = [];
  for (const line of lines) {
    const [email, ...rest] = line.split(/[,;\t]/).map((s) => s.trim());
    if (!z.email().safeParse(email).success) return { error: `Not a valid email: ${email}` };
    rows.push({ email: email!.toLowerCase(), unit_label: rest.join(" ").trim() || null });
  }

  const supabase = await createClient();
  const base = await publicSiteUrl();
  const { data: org } = await supabase.from("organizations").select("id, name, type").eq("id", orgId).single();
  if (!org) return { error: "Organization not found" };

  const { data: invites, error } = await supabase
    .from("invitations")
    .insert(rows.map((r) => ({ ...r, org_id: orgId, invited_by: viewer.userId })))
    .select("email, token");
  if (error) return { error: error.message };

  const results = await Promise.all(
    (invites ?? []).map((inv) =>
      sendInviteEmail({
        to: inv.email,
        orgName: org.name,
        orgTypeLabel: ORG_TYPE_META[org.type as OrgType].label,
        inviterName: viewer.profile.full_name || "Your admin",
        link: `${base}/invite/${inv.token}`,
      }),
    ),
  );
  const sent = results.filter((r) => r.ok).length;
  revalidatePath(`/app/org/${orgId}/members`);
  return {
    ok: true,
    message:
      sent === rows.length
        ? `Sent ${sent} invitation${sent === 1 ? "" : "s"}.`
        : `Created ${rows.length} invitation${rows.length === 1 ? "" : "s"}. ${sent} emailed. Copy the links below for the rest.`,
  };
}

export async function decideMemberAction(formData: FormData) {
  const viewer = await requireViewer();
  const id = String(formData.get("membership_id"));
  const orgId = String(formData.get("org_id"));
  const decision = String(formData.get("decision"));
  const supabase = await createClient();

  if (decision === "approve") {
    const { error } = await supabase.from("memberships").update({ status: "active" }).eq("id", id);
    if (!error) {
      const base = await publicSiteUrl();
      after(() => notifyMemberApproved(id, viewer.userId, base));
    }
  }
  else if (decision === "remove") await supabase.from("memberships").delete().eq("id", id);
  else if (decision === "make_staff") await supabase.from("memberships").update({ role: "staff" }).eq("id", id);
  else if (decision === "make_member") await supabase.from("memberships").update({ role: "member" }).eq("id", id);
  revalidatePath(`/app/org/${orgId}/members`);
}

export async function revokeInviteAction(formData: FormData) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", String(formData.get("invite_id")));
  revalidatePath(`/app/org/${String(formData.get("org_id"))}/members`);
}

/* ------------------------------------------------------------------ */
/* Notices & QR points                                                  */
/* ------------------------------------------------------------------ */
const noticeSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(120),
  body: z.string().trim().min(3, "Write the notice").max(2000),
});

export async function postNoticeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = noticeSchema.safeParse({ title: formData.get("title"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const orgId = formData.get("org_id") ? String(formData.get("org_id")) : null;

  const supabase = await createClient();
  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      ...parsed.data,
      org_id: orgId,
      municipality_id: orgId ? null : viewer.profile.municipality_id,
      author_id: viewer.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const base = await publicSiteUrl();
  after(() => notifyNotice(notice.id, viewer.userId, base));
  revalidatePath(orgId ? `/app/org/${orgId}` : "/app/muni", "layout");
  return { ok: true, message: "Notice published." };
}

export async function deleteNoticeAction(formData: FormData) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("notices").delete().eq("id", String(formData.get("notice_id")));
  revalidatePath("/app", "layout");
}

const qrSchema = z.object({
  org_id: z.uuid(),
  label: z.string().trim().min(2, "Name this spot").max(80),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export async function createQrPointAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const parsed = qrSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.from("qr_points").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath(`/app/org/${parsed.data.org_id}/qr`);
  return { ok: true, message: "QR code created." };
}

export async function deleteQrPointAction(formData: FormData) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("qr_points").delete().eq("id", String(formData.get("qr_id")));
  revalidatePath(`/app/org/${String(formData.get("org_id"))}/qr`);
}
