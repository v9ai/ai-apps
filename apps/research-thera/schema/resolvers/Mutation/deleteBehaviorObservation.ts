import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteBehaviorObservation: NonNullable<MutationResolvers['deleteBehaviorObservation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteBehaviorObservation(args.id, userEmail);

  return {
    success: true,
    message: "Behavior observation deleted successfully",
  };
};
