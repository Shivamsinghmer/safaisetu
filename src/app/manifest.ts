import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "SafaiSetu",
    short_name: "SafaiSetu",
    description: "Report waste issues, request pickups and track complaints.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2f6b1f",
    categories: ["utilities", "government"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Report an issue", short_name: "Report", url: "/app/report" },
      { name: "Request a pickup", short_name: "Pickup", url: "/app/pickup" },
      { name: "My complaints", short_name: "Tickets", url: "/app/tickets" },
    ],
  };
}
