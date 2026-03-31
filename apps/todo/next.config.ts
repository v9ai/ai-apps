import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async redirects() {
    return [
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
