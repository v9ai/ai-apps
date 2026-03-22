import type { MutationResolvers } from "./../../types.generated";
import { deleteDeepIssueAnalysis as deleteAnalysis } from "@/src/db";

export const deleteDeepIssueAnalysis: NonNullable<MutationResolvers['deleteDeepIssueAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await deleteAnalysis(args.id, userEmail);

  return { success: true, message: "Deep issue analysis deleted" };
};
