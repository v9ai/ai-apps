import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteBehaviorObservation: NonNullable<MutationResolvers['deleteBehaviorObservation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await db.deleteBehaviorObservation(args.id, userEmail);

  return {
    success: true,
    message: "Behavior observation deleted successfully",
  };
};
