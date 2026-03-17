import type { MutationResolvers } from "./../../types.generated";
import { deleteContactFeedback as _deleteContactFeedback } from "@/src/db";

export const deleteContactFeedback: NonNullable<MutationResolvers['deleteContactFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteContactFeedback(args.id, userEmail);

  return {
    success: true,
    message: "Contact feedback deleted successfully",
  };
};
