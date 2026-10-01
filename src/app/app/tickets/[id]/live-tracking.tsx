"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPinCheck, Navigation, Radio, TriangleAlert } from "lucide-react";
import { LiveRouteMap, type LivePoint, type RouteInfo } from "@/components/maps";
import { Button, Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { createClient } from "@/lib/supabase/client";
import { distanceBetween, etaMinutes, formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Dest = { lat: number; lng: number };

/** Send a new position at most every 8 s, or sooner after moving 25 m */
const SEND_EVERY_MS = 8_000;
const SEND_AFTER_M = 25;
/** Within this distance the worker counts as arrived */
const ARRIVED_M = 40;
/** A location older than this is shown as "last seen" */
const STALE_MS = 2 * 60_000;

/** Distance and time to the spot, from the road route when there is one */
function useTrip(me: LivePoint | null, dest: Dest) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const straight = me ? distanceBetween(me, dest) : null;
  // Road distance of the last route (refetched every ~60 m of movement), never less than the straight line
  const distance = route && straight != null ? Math.max(straight, route.distance) : straight;
  return { distance, duration: route?.duration ?? null, setRoute, straight };
}

function TripLine({ distance, duration }: { distance: number | null; duration: number | null }) {
  const { t } = useT();
  if (distance == null) return null;
  return (
    <span className="font-display text-[22px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">
      {duration != null ? `${etaMinutes(duration)} ${t("min")}` : formatDistance(distance)}
      {duration != null && <span className="ml-2 text-sm font-semibold text-slate">· {formatDistance(distance)}</span>}
    </span>
  );
}

/**
 * Shown to the assigned worker while the task is in progress: their live position, the reported spot and the road
 * route between them, like a ride-hailing driver app. The position is shared with the reporter and the officer.
 */
export function WorkerNavigator({ ticketId, dest, address }: { ticketId: string; dest: Dest; address: string }) {
  const { t } = useT();
  const [me, setMe] = useState<LivePoint | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [shared, setShared] = useState<"waiting" | "live" | "failed">("waiting");
  const [follow, setFollow] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const trip = useTrip(me, dest);

  const send = useCallback(
    async (p: GeolocationPosition) => {
      const prev = lastSent.current;
      const now = Date.now();
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (prev && now - prev.at < SEND_EVERY_MS && distanceBetween(prev, here) < SEND_AFTER_M) return;
      lastSent.current = { ...here, at: now };
      const { error } = await createClient().rpc("share_worker_location", {
        p_ticket: ticketId,
        p_lat: here.lat,
        p_lng: here.lng,
        p_accuracy: p.coords.accuracy ?? null,
        p_heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
        p_speed: Number.isFinite(p.coords.speed) ? p.coords.speed : null,
      });
      if (error) console.error("[live-location]", error.message);
      setShared(error ? "failed" : "live");
    },
    [ticketId],
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        setGeoError(null);
        setMe({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
        });
        void send(p);
      },
      (err) =>
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? t("Allow location access to navigate and share your live location.")
            : t("Couldn't get your location. Move to an open area and try again."),
        ),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    // Keep the screen on while navigating, like a driver app (where supported)
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});

    return () => {
      navigator.geolocation.clearWatch(watch);
      void lock?.release().catch(() => {});
    };
  }, [send, t, attempt]);

  // Virtually every browser has geolocation; checked during render so the effect never has to set state for it
  const [supported] = useState(() => typeof navigator === "undefined" || "geolocation" in navigator);
  const locationError = supported ? geoError : t("Location isn't available on this device.");
  const arrived = trip.straight != null && trip.straight <= ARRIVED_M;
  const origin = me ? `&origin=${me.lat},${me.lng}` : "";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="label-mono mb-1.5">{arrived ? t("You've arrived") : t("Navigate to the spot")}</div>
          {arrived ? (
            <span className="font-display text-[20px] font-bold text-emerald">{t("At the reported spot")}</span>
          ) : me ? (
            <TripLine distance={trip.distance} duration={trip.duration} />
          ) : (
            <span className="text-sm text-slate">{locationError ? "" : t("Finding your location…")}</span>
          )}
          <div className="mt-1 truncate text-[13px] text-slate">{address}</div>
        </div>
        <SharingBadge state={locationError ? "failed" : shared} />
      </div>

      <div className="relative isolate">
        <LiveRouteMap me={me} dest={dest} follow={follow} onUserMove={() => setFollow(false)} onRoute={trip.setRoute} height={340} />
        {!follow && me && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="absolute right-3 bottom-3 z-[500] flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-ink shadow-md ring-1 ring-bone"
          >
            <LocateFixed className="h-4 w-4 text-blue" /> {t("Recenter")}
          </button>
        )}
      </div>

      {locationError && (
        <div className="flex items-start gap-3 border-t border-bone bg-amber/10 px-5 py-3 text-sm text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div className="flex-1">{locationError}</div>
          <Button size="sm" variant="secondary" onClick={() => {
              setGeoError(null);
              setAttempt((n) => n + 1);
            }}>
            {t("Try again")}
          </Button>
        </div>
      )}
      {arrived && (
        <div className="flex items-start gap-3 border-t border-bone bg-emerald/[0.07] px-5 py-3 text-sm text-ink">
          <MapPinCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          {t("Clean up the spot, then upload the after photo below to resolve the task.")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-bone px-5 py-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1${origin}&destination=${dest.lat},${dest.lng}&travelmode=driving`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue px-4 text-[13px] font-bold text-snow hover:bg-blue/90"
        >
          <Navigation className="h-4 w-4" /> {t("Turn-by-turn in Google Maps")}
        </a>
        <span className="text-xs text-ash">{t("Your location is shared only while this task is in progress.")}</span>
      </div>
    </Card>
  );
}

function SharingBadge({ state }: { state: "waiting" | "live" | "failed" }) {
  const { t } = useT();
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
        state === "live" && "bg-emerald/10 text-emerald",
        state === "waiting" && "bg-mist text-slate",
        state === "failed" && "bg-coral/10 text-coral",
      )}
    >
      {state === "live" ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
        </span>
      ) : (
        <Radio className="h-3.5 w-3.5" />
      )}
      {state === "live" ? t("Sharing live location") : state === "waiting" ? t("Connecting…") : t("Not sharing")}
    </span>
  );
}

export interface WorkerLocationRow {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  updated_at: string;
}

/**
 * Shown to the reporter, the organization's staff and the officer while a worker is on the way:
 * the worker's live position moving towards the reported spot.
 */
export function WorkerTracker({
  ticketId,
  dest,
  workerName,
  initial,
}: {
  ticketId: string;
  dest: Dest;
  workerName: string;
  initial: WorkerLocationRow | null;
}) {
  const { t } = useT();
  const [loc, setLoc] = useState<WorkerLocationRow | null>(initial);
  const [follow, setFollow] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(`worker-loc-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worker_locations", filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setLoc(null);
          else setLoc(payload.new as WorkerLocationRow);
          setNow(Date.now());
        },
      )
      // Changes made while the connection was down (a sleeping phone, a hidden tab) aren't replayed,
      // so read the current row every time the channel (re)connects
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void supabase
          .from("worker_locations")
          .select("lat, lng, accuracy, heading, updated_at")
          .eq("ticket_id", ticketId)
          .maybeSingle<WorkerLocationRow>()
          .then(({ data, error }) => {
            if (error) return;
            setLoc(data);
            setNow(Date.now());
          });
      });
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearInterval(tick);
      void supabase.removeChannel(sub);
    };
  }, [ticketId]);

  const me: LivePoint | null = loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, heading: loc.heading } : null;
  const trip = useTrip(me, dest);
  const age = loc ? now - new Date(loc.updated_at).getTime() : null;
  const stale = age != null && age > STALE_MS;
  const arrived = trip.straight != null && trip.straight <= ARRIVED_M;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="label-mono mb-1.5">
            {arrived ? t("Worker has arrived") : t("Worker on the way")} · {workerName}
          </div>
          {!loc ? (
            <span className="text-sm text-slate">{t("Waiting for the worker's live location…")}</span>
          ) : arrived ? (
            <span className="font-display text-[20px] font-bold text-emerald">{t("At the reported spot")}</span>
          ) : (
            <TripLine distance={trip.distance} duration={trip.duration} />
          )}
          {loc && (
            <div className={cn("mt-1 text-[13px]", stale ? "text-amber" : "text-slate")}>
              {stale ? `${t("Last seen")} ${Math.round(age! / 60_000)} ${t("min ago")}` : t("Updating live")}
            </div>
          )}
        </div>
        {loc && !stale && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-blue/10 px-2.5 text-xs font-semibold text-blue">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue" />
            </span>
            {t("Live")}
          </span>
        )}
      </div>
      <div className="relative isolate">
        <LiveRouteMap
          me={me}
          dest={dest}
          stale={stale}
          follow={follow}
          onUserMove={() => setFollow(false)}
          onRoute={trip.setRoute}
          height={300}
        />
        {!follow && me && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="absolute right-3 bottom-3 z-[500] flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-ink shadow-md ring-1 ring-bone"
          >
            <Crosshair className="h-4 w-4 text-blue" /> {t("Recenter")}
          </button>
        )}
      </div>
    </Card>
  );
}
