import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://humans-of-ai.vercel.app/sitemap.xml",
    host: "https://humans-of-ai.vercel.app",
  };
}
