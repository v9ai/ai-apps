import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteUniqueOutcome: NonNullable<MutationResolvers['deleteUniqueOutcome']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteUniqueOutcome(args.id, userEmail);

  return {
    success: true,
    message: "Unique outcome deleted",
  };
};
