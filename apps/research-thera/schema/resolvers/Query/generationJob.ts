import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";

export const generationJob: NonNullable<QueryResolvers['generationJob']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const job = await db.getGenerationJob(args.id);
  // generation_jobs.user_id is email-keyed (see generationJobs plural + createGenerationJob callers).
  if (!job || job.userId !== userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return {
    id: job.id,
    userId: job.userId,
    type: job.type as any,
    goalId: job.goalId,
    storyId: job.storyId,
    status: job.status as any,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
};
