"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin";
import { db } from "@/db";
import { opportunities } from "@/db/schema";

export async function deleteOpportunity(id: string) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const rows = await db
    .delete(opportunities)
    .where(eq(opportunities.id, id))
    .returning({ id: opportunities.id });

  if (rows.length === 0) return { error: "Not found" };

  revalidatePath("/opportunities");
  return { deleted: true };
}

export async function updateOpportunityTags(id: string, tags: string[]) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const rows = await db
    .update(opportunities)
    .set({
      tags: JSON.stringify(tags),
      updated_at: new Date().toISOString(),
    })
    .where(eq(opportunities.id, id))
    .returning({ id: opportunities.id, tags: opportunities.tags });

  if (rows.length === 0) return { error: "Not found" };

  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  return { tags };
}
