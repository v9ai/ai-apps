import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
import path from "path";

const withVanillaExtract = createVanillaExtractPlugin();

const nextConfig: NextConfig = {
  // TODO: 120 TS errors across 35 files — triage and fix to remove this
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["onnxruntime-node"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingExcludes: {
    "*": ["node_modules/onnxruntime-node"],
  },
  outputFileTracingIncludes: {
    "/api/emails/send": ["../../packages/resume/CV_Vadim_Nicolai.pdf"],
  },
  async rewrites() {
    return [
      {
        source: "/resume/:slug.pdf",
        destination: "/api/resume-pdf/:slug",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
    ],
  },
};

export default withVanillaExtract(nextConfig);
