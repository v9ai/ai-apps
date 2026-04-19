import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/scripts": ["./scripts/**/*"],
    "/scripts/[id]": ["./scripts/**/*"],
    "/scripts/new": ["./scripts/**/*"],
  },
  rewrites: async () => [
    {
      source: "/backend/:path*",
      destination:
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:2025/:path*"
          : "/backend/",
    },
  ],
};

export default nextConfig;
