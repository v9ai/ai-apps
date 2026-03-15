import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteIssue: NonNullable<MutationResolvers['deleteIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteIssue(args.id, userEmail);

  return {
    success: true,
    message: "Issue deleted successfully",
  };
};
