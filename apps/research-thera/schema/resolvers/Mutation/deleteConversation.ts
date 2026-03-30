import type { MutationResolvers } from "./../../types.generated";
import { deleteConversation as _deleteConversation } from "@/src/db";

export const deleteConversation: NonNullable<MutationResolvers['deleteConversation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await _deleteConversation(args.id, userEmail);
  return { id: args.id };
};
