"use server";

import { getViewer } from "@/lib/session";
import { analyzeComplaintImage, classifyWasteItem, type ComplaintAnalysis, type ItemClassification } from "@/lib/groq";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_DATA_URL = 1_500_000; // ~1.1 MB image after base64

function validImage(dataUrl: string) {
  return /^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) && dataUrl.length <= MAX_DATA_URL;
}

export async function analyzePhotoAction(dataUrl: string): Promise<Result<ComplaintAnalysis>> {
  if (!(await getViewer())) return { ok: false, error: "Sign in to use AI tagging" };
  if (!validImage(dataUrl)) return { ok: false, error: "Unsupported or too large image" };
  try {
    return { ok: true, data: await analyzeComplaintImage(dataUrl) };
  } catch (e) {
    console.error("analyzePhoto", e);
    return { ok: false, error: "AI is unavailable right now. Pick the category manually." };
  }
}

export async function classifyItemAction(dataUrl: string): Promise<Result<ItemClassification>> {
  if (!(await getViewer())) return { ok: false, error: "Sign in to use the classifier" };
  if (!validImage(dataUrl)) return { ok: false, error: "Unsupported or too large image" };
  try {
    return { ok: true, data: await classifyWasteItem(dataUrl) };
  } catch (e) {
    console.error("classifyItem", e);
    return { ok: false, error: "AI is unavailable right now. Try the search below instead." };
  }
}
