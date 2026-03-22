import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/backend/:path*",
      destination:
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:2024/:path*"
          : "/backend/",
    },
  ],
  turbopack: {
    rules: {
      // Handle markdown files
      "*.md": {
        loaders: ["raw-loader"],
      },
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude generated schema files from hot reloading
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/schema/**/*.generated.*", "**/node_modules/**"],
    };

    // Fix for libsql trying to dynamically import README files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });

    // Ignore libsql's dynamic require of README files
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        libsql: "commonjs libsql",
      });
    }

    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // output: "standalone", // Only use for production builds, not dev
};

export default nextConfig;
