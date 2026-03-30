import type { QueryResolvers } from "./../../types.generated";
import { listConversationsForIssue } from "@/src/db";

export const conversationsForIssue: NonNullable<QueryResolvers['conversationsForIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const rows = await listConversationsForIssue(args.issueId, userEmail);
  return rows as any;
};
