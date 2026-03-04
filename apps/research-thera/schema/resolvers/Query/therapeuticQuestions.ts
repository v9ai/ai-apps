import type { QueryResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

export const therapeuticQuestions: NonNullable<QueryResolvers['therapeuticQuestions']> = async (_parent, args, _ctx) => {
  const result = await d1.execute({
    sql: `SELECT * FROM therapeutic_questions WHERE goal_id = ? ORDER BY created_at DESC`,
    args: [args.goalId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    question: row.question as string,
    researchId: (row.research_id as number) || null,
    researchTitle: (row.research_title as string) || null,
    rationale: row.rationale as string,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
};
