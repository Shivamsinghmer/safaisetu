import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import { distanceBetween } from "@/lib/geo";
import { AiError, verifyCleanup, type CleanupCheck } from "@/lib/groq";
import type { AfterCheck } from "@/lib/types";

/** What the worker's device reported when the after photo was taken (all optional, all worker-controlled) */
export interface PhotoSignals {
  lat?: number;
  lng?: number;
  accuracy?: number;
  /** File timestamp (ms): the capture time for camera photos */
  takenAt?: number;
  /** 64-bit difference hash, hex */
  hash?: string;
}

export function readSignals(formData: FormData): PhotoSignals {
  const num = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && formData.get(k) !== null && formData.get(k) !== "" ? v : undefined;
  };
  const hash = String(formData.get("sig_hash") ?? "");
  return {
    lat: num("sig_lat"),
    lng: num("sig_lng"),
    accuracy: num("sig_acc"),
    takenAt: num("sig_taken"),
    hash: /^[0-9a-f]{16}$/.test(hash) ? hash : undefined,
  };
}

/** Number of differing bits between two hex hashes, one hex digit (4 bits) at a time */
function hamming(a: string, b: string) {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i]!, 16) ^ parseInt(b[i] ?? "0", 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

interface TicketForCheck {
  id: string;
  lat: number;
  lng: number;
  photo_path: string | null;
  created_at: string;
}

/**
 * Checks a cleanup's after photo and records the result on the ticket (service role; users can't write it).
 * AI: same place as the reported photo? cleaned? reused, a screen photo or AI-generated?
 * Device: how far from the pin it was taken, whether it predates the assignment, and whether the same photo was
 * already used as proof on another ticket. The verdict is the worst finding: fail > review > pass.
 */
export async function runAfterCheck(ticket: TicketForCheck, afterPath: string, signals: PhotoSignals): Promise<AfterCheck> {
  const admin = createAdminClient();
  const reasons: AfterCheck["reasons"] = [];
  const add = (level: AfterCheck["reasons"][number]["level"], text: string) => reasons.push({ level, text });

  // ---- AI comparison ----
  const urls = await signedUrls([ticket.photo_path, afterPath], undefined, 300);
  const beforeUrl = ticket.photo_path ? (urls.get(ticket.photo_path) ?? null) : null;
  const afterUrl = urls.get(afterPath);
  let ai: CleanupCheck | null = null;
  if (afterUrl) {
    try {
      ai = await verifyCleanup(beforeUrl, afterUrl);
    } catch (e) {
      console.error("[after-check] AI failed", e instanceof AiError ? e.kind : "", e);
    }
  }
  if (!ai) add("review", "The AI check couldn't run, so a person should look at this photo");
  else {
    if (ai.reused_before) add("fail", "This is the reported photo again, not a new photo of the cleaned spot");
    if (ai.screen_photo) add("fail", "Looks like a screenshot or a photo of a screen, not a camera photo");
    if (ai.ai_generated && ai.ai_generated_confidence >= 0.6) add("fail", "Looks AI-generated or edited");
    else if (ai.ai_generated) add("review", "Might be edited or AI-generated");
    if (beforeUrl) {
      if (!ai.same_place && ai.same_place_confidence >= 0.6) add("fail", "Doesn't look like the same place as the report");
      else if (!ai.same_place || ai.same_place_confidence < 0.6) add("review", "Couldn't confirm it's the same place");
      else add("ok", "Same place as the reported photo");
    } else add("note", "No reported photo to compare with");
    if (!ai.cleaned && ai.cleaned_confidence >= 0.6) add("fail", "The waste still looks present");
    else if (!ai.cleaned) add("review", "Not clearly cleaned up");
    else add("ok", "The spot looks cleaned up");
    if (!ai.reused_before && !ai.screen_photo && !ai.ai_generated) add("ok", "Looks like a genuine camera photo");
  }

  // ---- Where it was taken ----
  let distance: number | null = null;
  if (signals.lat !== undefined && signals.lng !== undefined) {
    distance = Math.round(distanceBetween({ lat: signals.lat, lng: signals.lng }, ticket));
    const slack = Math.min(signals.accuracy ?? 0, 150);
    if (distance - slack > 2000) add("fail", `Taken ${(distance / 1000).toFixed(1)} km from the reported spot`);
    else if (distance - slack > 250) add("review", `Taken ${distance} m from the reported spot`);
    else add("ok", `Taken ${distance} m from the reported spot`);
  } else add("note", "The device didn't share its location");

  // ---- When it was taken ----
  if (signals.takenAt) {
    const { data: started } = await admin
      .from("ticket_events")
      .select("created_at")
      .eq("ticket_id", ticket.id)
      .in("to_status", ["assigned", "in_progress"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const since = new Date(started?.created_at ?? ticket.created_at).getTime();
    if (signals.takenAt < since - 10 * 60_000) add("review", "The photo file is older than the assignment");
  }

  // ---- Same photo used as proof before ----
  if (signals.hash) {
    const { data: others } = await admin
      .from("tickets")
      .select("code, after_check")
      .neq("id", ticket.id)
      .not("after_check", "is", null)
      .order("updated_at", { ascending: false })
      .limit(500);
    const twin = (others ?? []).find((o) => {
      const h = (o.after_check as AfterCheck | null)?.hash;
      return h && hamming(h, signals.hash!) <= 4;
    });
    if (twin) add("fail", `The same photo was already used as proof on ${twin.code}`);
  }

  const order = { fail: 0, review: 1, note: 2, ok: 3 } as const;
  reasons.sort((a, b) => order[a.level] - order[b.level]);
  const verdict: AfterCheck["verdict"] = reasons.some((r) => r.level === "fail")
    ? "fail"
    : reasons.some((r) => r.level === "review")
      ? "review"
      : "pass";

  const check: AfterCheck = {
    version: 1,
    path: afterPath,
    verdict,
    reasons,
    summary: ai?.summary ?? "",
    same_place: ai && beforeUrl ? ai.same_place : null,
    cleaned: ai ? ai.cleaned : null,
    genuine: ai ? !ai.reused_before && !ai.screen_photo && !ai.ai_generated : null,
    distance_m: distance,
    hash: signals.hash ?? null,
    checked_at: new Date().toISOString(),
  };
  const { error } = await admin.from("tickets").update({ after_check: check }).eq("id", ticket.id);
  if (error) console.error("[after-check] save failed", error.message);
  return check;
}
