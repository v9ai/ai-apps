import type { QueryResolvers, ResolversTypes } from "./../../types.generated";
import { sql } from "@/src/db/neon";

type RegimenAnalysisResult = NonNullable<ResolversTypes["RegimenAnalysis"]>;

const ALLOWED_SLUGS = new Set(["me", "bogdan"]);

export const regimenAnalysis: NonNullable<QueryResolvers['regimenAnalysis']> = async (_parent, args, ctx): Promise<RegimenAnalysisResult | null> => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const slug = (args.slug || "").trim().toLowerCase();
  if (!ALLOWED_SLUGS.has(slug)) return null;

  const rows = (await sql`
    SELECT id::text, slug, severity_overall, summary, flags, missing_facts,
           meds_count, language, updated_at
    FROM regimen_analysis
    WHERE user_id = ${userEmail} AND slug = ${slug}
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{
    id: string;
    slug: string;
    severity_overall: string | null;
    summary: string | null;
    flags: unknown;
    missing_facts: unknown;
    meds_count: number;
    language: string | null;
    updated_at: string | Date;
  }>;

  const row = rows[0];
  if (!row) return null;

  const flagsArr = Array.isArray(row.flags) ? row.flags : [];
  const flags = flagsArr.map((f) => {
    const obj = (f ?? {}) as Record<string, unknown>;
    return {
      type: typeof obj.type === "string" ? obj.type : "other",
      drugs: Array.isArray(obj.drugs) ? obj.drugs.filter((d): d is string => typeof d === "string") : [],
      severity: typeof obj.severity === "string" ? obj.severity : "low",
      message: typeof obj.message === "string" ? obj.message : "",
      recommendation: typeof obj.recommendation === "string" ? obj.recommendation : null,
    };
  });

  const missingFacts = Array.isArray(row.missing_facts)
    ? row.missing_facts.filter((s): s is string => typeof s === "string")
    : [];

  return {
    id: row.id,
    slug: row.slug,
    severityOverall: row.severity_overall,
    summary: row.summary,
    flags,
    missingFacts,
    medsCount: row.meds_count,
    language: row.language,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : row.updated_at.toISOString(),
  };
};
