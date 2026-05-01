"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin";
import { db } from "@/db";
import { opportunities, companies, blockedLocations } from "@/db/schema";
import { extractStack, type ExtractStackResult } from "@/lib/langgraph-client";

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

export type OpportunityEditableFields = {
  title?: string;
  url?: string | null;
  source?: string | null;
  status?: string;
  reward_text?: string | null;
  reward_usd?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  applied?: boolean;
  applied_at?: string | null;
  application_status?: string | null;
  application_notes?: string | null;
  raw_context?: string | null;
};

export async function updateOpportunity(id: string, fields: OpportunityEditableFields) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const patch: Record<string, unknown> = {};
  for (const key of [
    "title",
    "url",
    "source",
    "status",
    "reward_text",
    "reward_usd",
    "start_date",
    "end_date",
    "deadline",
    "applied",
    "applied_at",
    "application_status",
    "application_notes",
    "raw_context",
  ] as const) {
    if (key in fields) patch[key] = fields[key];
  }
  if (Object.keys(patch).length === 0) return { error: "No fields to update" };

  patch.updated_at = new Date().toISOString();

  const rows = await db
    .update(opportunities)
    .set(patch)
    .where(eq(opportunities.id, id))
    .returning({ id: opportunities.id });

  if (rows.length === 0) return { error: "Not found" };

  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  return { ok: true };
}

type BlockResult = { ok: true; companyKey: string | null } | { error: string };

export async function blockOpportunityCompany(id: string): Promise<BlockResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const found = await db
    .select({ company_id: opportunities.company_id, tags: opportunities.tags })
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);

  if (found.length === 0) return { error: "Not found" };
  const opp = found[0]!;

  if (opp.company_id != null) {
    const updated = await db
      .update(companies)
      .set({ blocked: true })
      .where(eq(companies.id, opp.company_id))
      .returning({ key: companies.key });

    revalidatePath("/opportunities");
    return { ok: true, companyKey: updated[0]?.key ?? null };
  }

  let current: string[] = [];
  try {
    const parsed = opp.tags ? JSON.parse(opp.tags) : [];
    if (Array.isArray(parsed)) current = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    current = [];
  }
  if (!current.includes("excluded")) {
    await db
      .update(opportunities)
      .set({ tags: JSON.stringify([...current, "excluded"]), updated_at: new Date().toISOString() })
      .where(eq(opportunities.id, id));
  }

  revalidatePath("/opportunities");
  return { ok: true, companyKey: null };
}

export async function blockD1OpportunityCompany(
  id: string,
  key: string | null,
  name: string | null,
): Promise<BlockResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  if (key) {
    await db
      .insert(companies)
      .values({ key, name: name ?? key, blocked: true })
      .onConflictDoUpdate({
        target: companies.key,
        set: { blocked: true },
      });

    revalidatePath("/opportunities");
    return { ok: true, companyKey: key };
  }

  const base = process.env.EDGE_WORKER_URL ?? "https://agenticleadgen-edge.eeeew.workers.dev";
  const token = process.env.JOBS_D1_TOKEN;
  if (!token) return { error: "JOBS_D1_TOKEN not configured" };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/jobs/d1/opportunities/archive`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ id }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: `worker ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
  }

  revalidatePath("/opportunities");
  return { ok: true, companyKey: null };
}

type HideResult = { ok: true } | { error: string };

export async function hideOpportunity(id: string): Promise<HideResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const found = await db
    .select({ tags: opportunities.tags })
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);
  if (found.length === 0) return { error: "Not found" };

  let current: string[] = [];
  try {
    const parsed = found[0]!.tags ? JSON.parse(found[0]!.tags) : [];
    if (Array.isArray(parsed)) current = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    current = [];
  }
  if (!current.includes("excluded")) {
    await db
      .update(opportunities)
      .set({ tags: JSON.stringify([...current, "excluded"]), updated_at: new Date().toISOString() })
      .where(eq(opportunities.id, id));
  }

  revalidatePath("/opportunities");
  return { ok: true };
}

export async function markD1Applied(id: string): Promise<HideResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const base = process.env.EDGE_WORKER_URL ?? "https://agenticleadgen-edge.eeeew.workers.dev";
  const token = process.env.JOBS_D1_TOKEN;
  if (!token) return { error: "JOBS_D1_TOKEN not configured" };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/jobs/d1/opportunities/status`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ id, status: "applied" }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: `worker ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
  }

  revalidatePath("/opportunities");
  return { ok: true };
}

export async function hideD1Opportunity(id: string): Promise<HideResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const base = process.env.EDGE_WORKER_URL ?? "https://agenticleadgen-edge.eeeew.workers.dev";
  const token = process.env.JOBS_D1_TOKEN;
  if (!token) return { error: "JOBS_D1_TOKEN not configured" };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/jobs/d1/opportunities/archive`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
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

type ExtractStackActionResult =
  | { ok: true; result: ExtractStackResult }
  | { error: string };

export async function extractOpportunityStackAction(
  id: string,
): Promise<ExtractStackActionResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const [row] = await db
    .select({
      title: opportunities.title,
      raw_context: opportunities.raw_context,
      metadata: opportunities.metadata,
    })
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);

  if (!row) return { error: "Not found" };
  const rawJd = row.raw_context ?? "";
  if (rawJd.trim().length < 40) {
    return { error: "raw_context too short to extract from" };
  }

  let result: ExtractStackResult;
  try {
    result = await extractStack({ rawJd, title: row.title });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  let mergedMetadata: Record<string, unknown> = {};
  if (row.metadata) {
    try {
      const parsed = JSON.parse(row.metadata);
      if (parsed && typeof parsed === "object") {
        mergedMetadata = parsed as Record<string, unknown>;
      }
    } catch {
      mergedMetadata = { _raw: row.metadata };
    }
  }
  mergedMetadata.required_stack = {
    skills: result.skills,
    summary: result.summary,
    confidence: result.confidence,
    model: result.model,
    extracted_at: new Date().toISOString(),
  };

  await db
    .update(opportunities)
    .set({
      metadata: JSON.stringify(mergedMetadata),
      updated_at: new Date().toISOString(),
    })
    .where(eq(opportunities.id, id));

  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  return { ok: true, result };
}

type BlockLocResult = { ok: true; pattern: string } | { error: string };

export async function blockLocation(label: string): Promise<BlockLocResult> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Forbidden" };

  const pattern = label.trim().toLowerCase();
  if (!pattern) return { error: "Empty location" };

  await db
    .insert(blockedLocations)
    .values({ pattern, label: label.trim() })
    .onConflictDoNothing();

  revalidatePath("/opportunities");
  return { ok: true, pattern };
}
