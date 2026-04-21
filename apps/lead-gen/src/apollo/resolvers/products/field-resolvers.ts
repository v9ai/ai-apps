import type { Product as DbProduct } from "@/db/schema";

export const ProductField = {
  createdBy: (p: DbProduct) => p.created_by ?? null,
  createdAt: (p: DbProduct) => p.created_at,
  updatedAt: (p: DbProduct) => p.updated_at,
  domain: (p: DbProduct) => p.domain ?? null,
  description: (p: DbProduct) => p.description ?? null,
};
