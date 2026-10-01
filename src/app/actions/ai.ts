"use server";

import { getViewer } from "@/lib/session";
import { LIMITS, TOO_MANY, allow } from "@/lib/rate-limit";
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
  return { ok: false, error: fallback };
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
