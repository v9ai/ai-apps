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

export async function blockOpportunity(id: string) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const existing = await db
    .select({ tags: opportunities.tags })
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);

  if (existing.length === 0) return { error: "Not found" };

  let current: string[] = [];
  try {
    const parsed = existing[0]!.tags ? JSON.parse(existing[0]!.tags) : [];
    if (Array.isArray(parsed)) current = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    current = [];
  }
  if (current.includes("excluded")) {
    return { ok: true };
  }
  const next = [...current, "excluded"];

  await db
    .update(opportunities)
    .set({ tags: JSON.stringify(next), updated_at: new Date().toISOString() })
    .where(eq(opportunities.id, id));

  revalidatePath("/opportunities");
  return { ok: true };
}

export async function archiveD1Opportunity(id: string) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const base = process.env.EDGE_WORKER_URL ?? "https://agenticleadgen-edge.eeeew.workers.dev";
  const token = process.env.JOBS_D1_TOKEN;
  if (!token) return { error: "JOBS_D1_TOKEN not configured" };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/jobs/d1/opportunities/archive`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: `worker ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
  }

  revalidatePath("/opportunities");
  return { ok: true };
}
