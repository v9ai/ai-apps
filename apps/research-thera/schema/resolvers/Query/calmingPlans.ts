import type { QueryResolvers } from "./../../types.generated";
import { sql } from "@/src/db/neon";
import { getFamilyMember } from "@/src/db";

export const calmingPlans: NonNullable<QueryResolvers['calmingPlans']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const member = await getFamilyMember(args.familyMemberId);
  if (!member || member.userId !== userEmail) return [];

  const rows = await sql`
    SELECT id, family_member_id, language, plan_json, plan_markdown,
           sources_json, safety_notes, generated_at
    FROM calming_plans
    WHERE family_member_id = ${args.familyMemberId} AND user_id = ${userEmail}
    ORDER BY generated_at DESC
  `;

  return rows.map((r: any) => ({
    id: r.id as number,
    familyMemberId: r.family_member_id as number,
    language: r.language as string,
    planJson: typeof r.plan_json === "string" ? r.plan_json : JSON.stringify(r.plan_json ?? {}),
    planMarkdown: r.plan_markdown as string,
    sourcesJson: typeof r.sources_json === "string" ? r.sources_json : JSON.stringify(r.sources_json ?? []),
    safetyNotes: (r.safety_notes as string) ?? null,
    generatedAt: r.generated_at as string,
  }));
};
