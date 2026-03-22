import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async redirects() {
    return [
      {
        source: "/app/active",
        destination: "/app?status=active",
        permanent: true,
      },
      {
        source: "/app/completed",
        destination: "/app?status=completed",
        permanent: true,
      },
      {
        source: "/app/settings",
        destination: "/app",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
