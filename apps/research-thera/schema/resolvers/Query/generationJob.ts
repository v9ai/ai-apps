import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const generationJob: NonNullable<QueryResolvers['generationJob']> = async (_parent, args, _ctx) => {
  const job = await d1Tools.getGenerationJob(args.id);
  if (!job) return null;

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
