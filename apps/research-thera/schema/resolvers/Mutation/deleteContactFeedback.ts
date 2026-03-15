import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteContactFeedback: NonNullable<MutationResolvers['deleteContactFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteContactFeedback(args.id, userEmail);

  return {
    success: true,
    message: "Contact feedback deleted successfully",
  };
};
