import type { QueryResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

export const generationJobs: NonNullable<QueryResolvers['generationJobs']> = async (_parent, args, ctx) => {
  let sql = `SELECT * FROM generation_jobs`;
  const queryArgs: any[] = [];
  const conditions: string[] = [];

  if (ctx.userEmail) {
    conditions.push(`user_id = ?`);
    queryArgs.push(ctx.userEmail);
  }

  if (args.goalId) {
    conditions.push(`goal_id = ?`);
    queryArgs.push(args.goalId);
  }

  if (args.status) {
    conditions.push(`status = ?`);
    queryArgs.push(args.status);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await d1.execute({ sql, args: queryArgs });

  return result.rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as any,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    status: row.status as any,
    progress: row.progress as number,
    result: row.result ? JSON.parse(row.result as string) : null,
    error: row.error ? JSON.parse(row.error as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
};
