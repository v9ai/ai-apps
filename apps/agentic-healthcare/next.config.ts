import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  turbopack: {
    root: new URL("../..", import.meta.url).pathname,
    resolveAlias: {
      "styled-system/css": "./apps/agentic-healthcare/styled-system/css",
    },
  },
};

export default nextConfig;
