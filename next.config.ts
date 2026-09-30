import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // compressed photos for AI analysis are sent as data URLs
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
