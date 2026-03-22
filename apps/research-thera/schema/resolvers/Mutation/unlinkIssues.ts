import type { MutationResolvers } from "./../../types.generated";
import { unlinkIssues as _unlinkIssues } from "@/src/db";

export const unlinkIssues: NonNullable<MutationResolvers['unlinkIssues']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await _unlinkIssues(args.issueId, args.linkedIssueId, userEmail);

  return { success: true };
};
