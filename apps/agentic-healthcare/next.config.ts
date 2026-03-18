import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-apps/auth"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
