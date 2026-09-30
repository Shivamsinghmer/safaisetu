import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Dev only: let phones on the same Wi-Fi open the dev server (e.g. after scanning a QR code)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  experimental: {
    // compressed photos for AI analysis are sent as data URLs
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
