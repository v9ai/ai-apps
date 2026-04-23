import type { MetadataRoute } from "next";

const BASE = "https://agenticleadgen.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/settings",
          "/sign-in",
          "/sign-up",
          "/admin",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
