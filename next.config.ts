import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Room for product photo uploads from the admin page (Vercel caps request bodies at 4.5 MB).
  experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
  images: {
    // Product photos uploaded to Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
