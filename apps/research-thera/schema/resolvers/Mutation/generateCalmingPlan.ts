import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { getFamilyMember } from "@/src/db";
import { sql } from "@/src/db/neon";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateCalmingPlan: NonNullable<MutationResolvers['generateCalmingPlan']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { familyMemberId } = args;
  const member = await getFamilyMember(familyMemberId);
  if (!member || member.userId !== userEmail) {
    throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
  }

  // Hard gate: calming plan is Bogdan-only for now. Frontend hides the entry
  // points; this guard catches anyone hitting the mutation directly.
  if (member.firstName.trim().toLowerCase() !== "bogdan") {
    throw new GraphQLError(
      "Calming plan is currently only available for Bogdan.",
      { extensions: { code: "FORBIDDEN" } },
    );
  }

  const language = args.language ?? "ro";

  try {
    const result = await runGraphAndWait("calming_plan", {
      input: {
        family_member_id: familyMemberId,
        user_email: userEmail,
        language,
      },
    });

    const error = result?.error as string | undefined;
    if (error) {
      return { success: false, message: error, plan: null };
    }

    const planId = result?.plan_id as number | undefined;
    if (!planId) {
      return {
        success: false,
        message: "Graph did not return a plan_id",
        plan: null,
      };
    }

    // Re-read the persisted row so the client gets every field via one canonical path.
    const rows = await sql`
      SELECT id, family_member_id, language, plan_json, plan_markdown,
             sources_json, safety_notes, generated_at
      FROM calming_plans WHERE id = ${planId} AND user_id = ${userEmail} LIMIT 1
    `;
    if (rows.length === 0) {
      return {
        success: false,
        message: "Plan generated but not found in database",
        plan: null,
      };
    }
    const r: any = rows[0];
    return {
      success: true,
      message: `Plan generated (id ${planId}).`,
      plan: {
        id: r.id as number,
        familyMemberId: r.family_member_id as number,
        language: r.language as string,
        planJson: typeof r.plan_json === "string" ? r.plan_json : JSON.stringify(r.plan_json ?? {}),
        planMarkdown: r.plan_markdown as string,
        sourcesJson: typeof r.sources_json === "string" ? r.sources_json : JSON.stringify(r.sources_json ?? []),
        safetyNotes: (r.safety_notes as string) ?? null,
        generatedAt: r.generated_at as string,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to generate calming plan: ${err.message}`,
      plan: null,
    };
  }
};
