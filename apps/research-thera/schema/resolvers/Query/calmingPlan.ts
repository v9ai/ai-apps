import type { QueryResolvers } from "./../../types.generated";
import { sql } from "@/src/db/neon";
import { hasFamilyMemberAccess } from "@/src/db";

export const calmingPlan: NonNullable<QueryResolvers['calmingPlan']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const rows = await sql`
    SELECT id, family_member_id, language, plan_json, plan_markdown,
           sources_json, safety_notes, generated_at
    FROM calming_plans
    WHERE id = ${args.id}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r: any = rows[0];
  const allowed = await hasFamilyMemberAccess(r.family_member_id as number, userEmail);
  if (!allowed) return null;

  return {
    id: r.id as number,
    familyMemberId: r.family_member_id as number,
    language: r.language as string,
    planJson: typeof r.plan_json === "string" ? r.plan_json : JSON.stringify(r.plan_json ?? {}),
    planMarkdown: r.plan_markdown as string,
    sourcesJson: typeof r.sources_json === "string" ? r.sources_json : JSON.stringify(r.sources_json ?? []),
    safetyNotes: (r.safety_notes as string) ?? null,
    generatedAt:
      r.generated_at instanceof Date
        ? r.generated_at.toISOString()
        : (r.generated_at as string),
  };
};
