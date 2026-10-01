import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limits, counted in Postgres (public.take_rate_limit) so they hold
 * across serverless instances. Fails open: if the check itself errors, the action goes
 * ahead, because blocking every report on a database hiccup is worse than a burst.
 */
export async function allow(key: string, max: number, windowSeconds: number) {
  try {
    const { data, error } = await createAdminClient().rpc("take_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[rate-limit]", e instanceof Error ? e.message : e);
    return true;
  }
}

/** The caller's IP, for limits on actions that have no signed-in user. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Limits used across the app, in one place. */
export const LIMITS = {
  report: { max: 15, window: 3600 }, // new reports per user per hour
  ai: { max: 40, window: 3600 }, // photo analyses per user per hour
  guestAi: { max: 15, window: 3600 }, // photo analyses per IP per hour on guest QR pages
  guestReport: { max: 5, window: 3600 }, // guest QR reports per IP per hour
  support: { max: 30, window: 3600 }, // "me too" per user per hour
  signup: { max: 10, window: 3600 }, // sign-ups per IP per hour
  invite: { max: 10, window: 3600 }, // invite batches per user per hour
} as const;

export const TOO_MANY = "You're doing that too often. Please wait a while and try again.";
