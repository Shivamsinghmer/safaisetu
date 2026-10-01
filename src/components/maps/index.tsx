"use client";

import dynamic from "next/dynamic";

function MapSkeleton({ height = 420 }: { height?: number }) {
  return <div className="w-full animate-pulse bg-plaster/70" style={{ height }} />;
}

export const OverviewMap = dynamic(() => import("./maps-impl"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export const PickerMap = dynamic(() => import("./maps-impl").then((m) => m.PickerMap), {
  ssr: false,
  loading: () => <MapSkeleton height={260} />,
});

export type { MapTicket, MapOrg } from "./maps-impl";

export const LiveRouteMap = dynamic(() => import("./live-route-impl"), {
  ssr: false,
  loading: () => <MapSkeleton height={340} />,
});

export type { LivePoint, RouteInfo } from "./live-route-impl";
