import { networkInterfaces } from "node:os";
import { headers } from "next/headers";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** First non-internal IPv4 address of this machine (e.g. 192.168.1.7), for phones on the same Wi-Fi. */
function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    const ip = list?.find((a) => a.family === "IPv4" && !a.internal);
    if (ip) return ip.address;
  }
  return null;
}

/**
 * Absolute base URL for links that leave this device: printed QR codes, invite links.
 * Server only (reads request headers).
 *
 * 1. `NEXT_PUBLIC_SITE_URL`, unless it points at localhost (a phone can't open that).
 * 2. Otherwise the host this request came in on (correct on any deployment).
 * 3. In development on localhost, swap in the machine's LAN IP so a phone on the
 *    same Wi-Fi can scan a QR code and reach the dev server.
 */
export async function publicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && !LOOPBACK.test(new URL(configured).hostname)) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return configured ?? "http://localhost:3000";
  const url = new URL(`${h.get("x-forwarded-proto") ?? "http"}://${host}`);

  if (process.env.NODE_ENV === "development" && LOOPBACK.test(url.hostname)) {
    const lan = lanAddress();
    if (lan) url.hostname = lan;
  }
  return url.origin;
}
