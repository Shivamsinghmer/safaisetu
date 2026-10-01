"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { TicketStatus } from "@/lib/types";

// Standard OpenStreetMap tiles: no API key needed (toned down in globals.css)
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const STATUS_COLORS: Record<TicketStatus, string> = {
  submitted: "#838383",
  assigned: "#7b68c8",
  in_progress: "#0091ff",
  resolved: "#00c07a",
  closed: "#00c07a",
  reopened: "#fa24ce",
  rejected: "#b3b3b3",
};

function dotIcon(color: string, size = 14, ring = "#ffffff") {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px ${ring},0 1px 3px rgba(0,0,0,.25)"></span>`,
  });
}

const pinIcon = L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  // Brand green with a white outline: readable on light and dark (inverted) map tiles
  html: `<svg width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M14 35s12-11.2 12-21A12 12 0 0 0 2 14c0 9.8 12 21 12 21z" fill="#3f7a28" stroke="#fff" stroke-width="1.5"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`,
});

const orgIcon = (color: string) =>
  L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:5px;background:#fff;border:2px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>`,
  });

export interface MapTicket {
  id: string;
  code: string;
  lat: number;
  lng: number;
  status: TicketStatus;
  label: string;
}

export interface MapOrg {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "society" | "college" | "public_place";
}

const ORG_COLORS = { society: "#3f7a28", college: "#0091ff", public_place: "#fd9a46" };

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0]!, 15);
  }, [map, points]);
  return null;
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    (window as unknown as { L: typeof L }).L = L;
    import("leaflet.heat").then(() => {
      if (cancelled) return;
      layer = (L as unknown as { heatLayer: (p: unknown, o: unknown) => L.Layer }).heatLayer(points, {
        radius: 28,
        blur: 22,
        maxZoom: 16,
        minOpacity: 0.35,
        gradient: { 0.2: "#6ee7b7", 0.45: "#fd9a46", 0.7: "#fc6d7b", 1: "#fa24ce" },
      });
      layer.addTo(map);
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

export default function OverviewMap({
  tickets = [],
  orgs = [],
  heat = false,
  center = [26.4499, 80.3319], // Kanpur
  height = 420,
  onSelect,
}: {
  tickets?: MapTicket[];
  orgs?: MapOrg[];
  heat?: boolean;
  center?: [number, number];
  height?: number;
  onSelect?: (id: string) => void;
}) {
  const points = useMemo<[number, number][]>(
    () => [...tickets.map((t) => [t.lat, t.lng] as [number, number]), ...orgs.map((o) => [o.lat, o.lng] as [number, number])],
    [tickets, orgs],
  );
  const heatPoints = useMemo<[number, number, number][]>(
    () => tickets.map((t) => [t.lat, t.lng, t.status === "resolved" || t.status === "closed" ? 0.3 : 1]),
    [tickets],
  );

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height, width: "100%" }}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <FitBounds points={points} />
      {heat && <HeatLayer points={heatPoints} />}
      {!heat &&
        tickets.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat, t.lng]}
            icon={dotIcon(STATUS_COLORS[t.status])}
            eventHandlers={{ click: () => onSelect?.(t.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-mono text-[11px]">{t.code}</span> · {t.label}
            </Tooltip>
          </Marker>
        ))}
      {orgs.map((o) => (
        <Marker key={o.id} position={[o.lat, o.lng]} icon={orgIcon(ORG_COLORS[o.type])}>
          <Tooltip direction="top" offset={[0, -8]}>
            {o.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [map, lat, lng]);
  return null;
}

export function PickerMap({
  lat,
  lng,
  onMove,
  height = 260,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
  height?: number;
}) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} style={{ height, width: "100%" }}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <Recenter lat={lat} lng={lng} />
      <ClickToMove onMove={onMove} />
      <Marker
        position={[lat, lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onMove(p.lat, p.lng);
          },
        }}
      />
    </MapContainer>
  );
}
