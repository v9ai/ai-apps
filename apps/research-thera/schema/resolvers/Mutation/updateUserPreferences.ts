import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateUserPreferences: NonNullable<MutationResolvers['updateUserPreferences']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const { input } = args;
  return db.upsertUserPreferences(userEmail, {
    chronotype: input.chronotype ?? undefined,
    chunkSize: input.chunkSize ?? undefined,
    gamificationEnabled: input.gamificationEnabled ?? undefined,
    bufferPercentage: input.bufferPercentage ?? undefined,
    priorityWeights: input.priorityWeights ?? undefined,
  });
};
