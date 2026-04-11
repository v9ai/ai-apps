import type { MetadataRoute } from "next";
import { getAllPersonalities } from "@/lib/personalities";

const BASE_URL = "https://humans-of-ai.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const personalities = getAllPersonalities();

  const personEntries: MetadataRoute.Sitemap = personalities.map((p) => ({
    url: `${BASE_URL}/person/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/stats`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
...personEntries,
  ];
}
