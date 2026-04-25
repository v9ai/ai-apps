import type { QueryResolvers } from "./../../types.generated";
import { listGenerationJobs } from "@/src/db";

export const generationJobs: NonNullable<QueryResolvers['generationJobs']> = async (_parent, args, ctx) => {
  return listGenerationJobs({
    userId: ctx.userEmail ?? undefined,
    goalId: args.goalId ?? undefined,
    status: args.status ?? undefined,
    type: args.type ?? undefined,
    limit: 20,
  });
};
