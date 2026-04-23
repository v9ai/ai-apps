import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";
import { slugify } from "@/lib/slug";

// Regenerate hourly — plenty for a catalog that changes on admin-initiated
// intel runs (not per-request).
export const revalidate = 3600;

const BASE = "https://agenticleadgen.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db
    .select({
      name: products.name,
      slug: products.slug,
      updated_at: products.updated_at,
    })
    .from(products);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "daily" },
    { url: `${BASE}/products`, priority: 0.9, changeFrequency: "daily" },
  ];

  const productEntries: MetadataRoute.Sitemap = rows.flatMap((p) => {
    const slug = p.slug ?? slugify(p.name);
    const lastModified = p.updated_at ? new Date(p.updated_at) : undefined;
    return [
      {
        url: `${BASE}/products/${slug}`,
        priority: 0.8,
        changeFrequency: "weekly" as const,
        lastModified,
      },
      {
        url: `${BASE}/products/${slug}/icp`,
        priority: 0.7,
        changeFrequency: "weekly" as const,
        lastModified,
      },
      {
        url: `${BASE}/products/${slug}/pricing`,
        priority: 0.7,
        changeFrequency: "weekly" as const,
        lastModified,
      },
      {
        url: `${BASE}/products/${slug}/gtm`,
        priority: 0.7,
        changeFrequency: "weekly" as const,
        lastModified,
      },
      {
        url: `${BASE}/products/${slug}/intel`,
        priority: 0.7,
        changeFrequency: "weekly" as const,
        lastModified,
      },
    ];
  });

  return [...staticEntries, ...productEntries];
}
