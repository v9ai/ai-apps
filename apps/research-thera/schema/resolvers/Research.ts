import type { ResearchResolvers } from "./../types.generated";
import { d1 } from "@/src/db";

export const Research: ResearchResolvers = {
  goal: async (parent, _args, _ctx) => {
    // Fetch the goal associated with this research
    const result = await d1.execute({
      sql: `SELECT * FROM goals WHERE id = ?`,
      args: [parent.goalId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as number,
      familyMemberId: row.family_member_id as number,
      userId: row.user_id as string,
      title: row.title as string,
      description: (row.description as string) || null,
      status: row.status as string,
      therapeuticText: (row.therapeutic_text as string) || null,
      therapeuticTextLanguage:
        (row.therapeutic_text_language as string) || null,
      therapeuticTextGeneratedAt:
        (row.therapeutic_text_generated_at as string) || null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      notes: [],
      research: [],
      questions: [],
      stories: [],
      userStories: [],
    } as any;
  },
};
