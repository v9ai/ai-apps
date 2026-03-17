import type { MutationResolvers } from "./../../types.generated";
import { deleteIssue as _deleteIssue } from "@/src/db";

export const deleteIssue: NonNullable<MutationResolvers['deleteIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteIssue(args.id, userEmail);

  return {
    success: true,
    message: "Issue deleted successfully",
  };
};
