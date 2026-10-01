"use server";

import { getViewer } from "@/lib/session";
import { LIMITS, TOO_MANY, allow, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AiError,
  analyzeComplaintImage,
  classifyWasteItem,
  type ComplaintAnalysis,
  type ItemClassification,
} from "@/lib/groq";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_DATA_URL = 1_500_000; // ~1.1 MB image after base64

function validImage(dataUrl: string) {
  return /^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) && dataUrl.length <= MAX_DATA_URL;
}

/**
 * User-facing message for an AI failure. In development the real cause is shown
 * (e.g. an invalid key) so it can be fixed; in production users get a friendly fallback.
 */
function failure(context: string, e: unknown, fallback: string): { ok: false; error: string } {
  const err = e instanceof AiError ? e : null;
  console.error(`[ai] ${context} failed${err ? ` (${err.kind})` : ""}:`, e);
  if (err?.kind === "rate_limit") return { ok: false, error: "AI is busy right now. Try again in a minute." };
  if (process.env.NODE_ENV !== "production" && err) return { ok: false, error: `AI error (${err.kind}): ${err.message}` };
  // A short cause code (no details) so a production failure can be diagnosed from a screenshot
  return { ok: false, error: `${fallback} (${err?.kind ?? "unknown"})` };
}

export async function analyzePhotoAction(dataUrl: string): Promise<Result<ComplaintAnalysis>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to use AI tagging" };
  if (!validImage(dataUrl)) return { ok: false, error: "Unsupported or too large image" };
  if (!(await allow(`ai:${viewer.userId}`, LIMITS.ai.max, LIMITS.ai.window))) return { ok: false, error: TOO_MANY };
  try {
    return { ok: true, data: await analyzeComplaintImage(dataUrl) };
  } catch (e) {
    return failure("analyzePhoto", e, "AI is unavailable right now. Pick the category manually.");
  }
}

/**
 * AI tagging for the guest QR page (no account). Only works for an active QR code of an approved
 * organization, and is limited per IP, so it can't be used as an open AI endpoint.
 */
export async function analyzeGuestPhotoAction(qrId: string, dataUrl: string): Promise<Result<ComplaintAnalysis>> {
  if (!/^[0-9a-f-]{36}$/i.test(qrId)) return { ok: false, error: "This QR code is no longer active." };
  if (!validImage(dataUrl)) return { ok: false, error: "Unsupported or too large image" };
  const { data: qr } = await createAdminClient()
    .from("qr_points")
    .select("id, organizations!inner(status)")
    .eq("id", qrId)
    .eq("organizations.status", "approved")
    .maybeSingle();
  if (!qr) return { ok: false, error: "This QR code is no longer active." };
  const ip = await clientIp();
  if (!(await allow(`guest-ai:${ip}`, LIMITS.guestAi.max, LIMITS.guestAi.window))) return { ok: false, error: TOO_MANY };
  try {
    return { ok: true, data: await analyzeComplaintImage(dataUrl) };
  } catch (e) {
    return failure("analyzeGuestPhoto", e, "AI is unavailable right now. Pick what's wrong below.");
  }
}

export async function classifyItemAction(dataUrl: string): Promise<Result<ItemClassification>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to use the classifier" };
  if (!validImage(dataUrl)) return { ok: false, error: "Unsupported or too large image" };
  if (!(await allow(`ai:${viewer.userId}`, LIMITS.ai.max, LIMITS.ai.window))) return { ok: false, error: TOO_MANY };
  try {
    return { ok: true, data: await classifyWasteItem(dataUrl) };
  } catch (e) {
    return failure("classifyItem", e, "AI is unavailable right now. Try the search below instead.");
  }
}
