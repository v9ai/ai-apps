import type { Product as DbProduct } from "@/db/schema";
import { slugify } from "@/lib/slug";

export const ProductField = {
  slug: (p: DbProduct) => slugify(p.name),
  createdBy: (p: DbProduct) => p.created_by ?? null,
  createdAt: (p: DbProduct) => p.created_at,
  updatedAt: (p: DbProduct) => p.updated_at,
  domain: (p: DbProduct) => p.domain ?? null,
  description: (p: DbProduct) => p.description ?? null,
};
