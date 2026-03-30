import type { QueryResolvers } from "./../../types.generated";
import { getConversation } from "@/src/db";

export const conversation: NonNullable<QueryResolvers['conversation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const c = await getConversation(args.id, userEmail);
  if (!c) return null;
  return c as any;
};
