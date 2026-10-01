"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { distanceBetween } from "@/lib/geo";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Public OSRM server: road routes without an API key. If it fails, a straight dashed line is drawn instead.
const ROUTER_URL = "https://router.project-osrm.org/route/v1/driving";

export interface LivePoint {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
}

export interface RouteInfo {
  /** Road distance in metres (straight-line distance when no road route is available) */
  distance: number;
  /** Driving time in seconds, or null without a road route */
  duration: number | null;
}

const destIcon = L.divIcon({
  className: "",
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  html: `<svg width="32" height="42" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M14 35s12-11.2 12-21A12 12 0 0 0 2 14c0 9.8 12 21 12 21z" fill="#e5484d" stroke="#fff" stroke-width="1.5"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`,
});

function workerIcon(heading: number | null | undefined, stale: boolean) {
  const color = stale ? "#8b8d98" : "#0091ff";
  const cone =
    heading != null && !stale
      ? `<span style="position:absolute;left:50%;top:50%;width:0;height:0;transform:translate(-50%,-100%) rotate(${heading}deg);transform-origin:50% 100%;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid ${color}55"></span>`
      : "";
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<span style="position:relative;display:block;width:44px;height:44px">
      ${stale ? "" : `<span class="live-pulse" style="position:absolute;inset:8px;border-radius:9999px;background:${color}"></span>`}
      ${cone}
      <span style="position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);border-radius:9999px;background:${color};box-shadow:0 0 0 3px #fff,0 2px 6px rgba(0,0,0,.35)"></span>
    </span>`,
  });
}

/** While following, keeps both the worker and the spot in view (like a ride-hailing map); dragging the map stops it. */
function Camera({ me, dest, follow, onUserMove }: { me: LivePoint | null; dest: LivePoint; follow: boolean; onUserMove: () => void }) {
  const map = useMap();
  const first = useRef(true);
  useMapEvents({ dragstart: onUserMove });

  useEffect(() => {
    if (!follow) return;
    if (!me) {
      map.setView([dest.lat, dest.lng], 16);
      return;
    }
    map.fitBounds(
      L.latLngBounds([
        [me.lat, me.lng],
        [dest.lat, dest.lng],
      ]),
      { padding: [48, 48], maxZoom: 17, animate: !first.current },
    );
    first.current = false;
  }, [map, me, dest, follow]);
  return null;
}

export default function LiveRouteMap({
  me,
  dest,
  stale = false,
  follow = true,
  height = 340,
  onUserMove,
  onRoute,
}: {
  me: LivePoint | null;
  dest: LivePoint;
  stale?: boolean;
  follow?: boolean;
  height?: number;
  onUserMove?: () => void;
  onRoute?: (info: RouteInfo | null) => void;
}) {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const lastOrigin = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const onRouteRef = useRef(onRoute);
  useEffect(() => {
    onRouteRef.current = onRoute;
  });

  // Fetch a road route when the worker first appears, then again after moving ~60 m or every 90 s.
  // A response is used only if no newer request started meanwhile.
  const reqId = useRef(0);
  useEffect(() => {
    if (!me) return;
    const prev = lastOrigin.current;
    const now = Date.now();
    if (prev && distanceBetween(prev, me) < 60 && now - prev.at < 90_000) return;
    lastOrigin.current = { lat: me.lat, lng: me.lng, at: now };
    const id = ++reqId.current;
    const straight = distanceBetween(me, dest);
    fetch(`${ROUTER_URL}/${me.lng},${me.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] }) => {
        const best = json.routes?.[0];
        if (!best) throw new Error("no route");
        if (id !== reqId.current) return;
        setRoute(best.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        onRouteRef.current?.({ distance: best.distance, duration: best.duration });
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setRoute(null);
        onRouteRef.current?.({ distance: straight, duration: null });
      });
  }, [me, dest]);
  useEffect(() => () => void (reqId.current = -1), []);

  const icon = useMemo(() => workerIcon(me?.heading, stale), [me?.heading, stale]);
  const line: [number, number][] | null = me ? (route ?? [[me.lat, me.lng], [dest.lat, dest.lng]]) : null;

  return (
    <MapContainer center={[dest.lat, dest.lng]} zoom={15} scrollWheelZoom={false} style={{ height, width: "100%" }}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <Camera me={me} dest={dest} follow={follow} onUserMove={() => onUserMove?.()} />
      {line && (
        <>
          <Polyline positions={line} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }} />
          <Polyline
            positions={line}
            pathOptions={{ color: stale ? "#8b8d98" : "#0091ff", weight: 5, opacity: 0.95, dashArray: route ? undefined : "8 10" }}
          />
        </>
      )}
      <Marker position={[dest.lat, dest.lng]} icon={destIcon} />
      {me && me.accuracy != null && me.accuracy > 15 && me.accuracy < 500 && (
        <Circle
          center={[me.lat, me.lng]}
          radius={me.accuracy}
          pathOptions={{ color: "#0091ff", weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
        />
      )}
      {me && <Marker position={[me.lat, me.lng]} icon={icon} zIndexOffset={1000} />}
    </MapContainer>
  );
}
