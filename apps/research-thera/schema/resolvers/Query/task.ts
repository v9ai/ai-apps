import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const task: NonNullable<QueryResolvers['task']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const row = await db.getTask(args.id, userEmail);
  return row as any;
};
