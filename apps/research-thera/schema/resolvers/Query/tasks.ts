import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const tasks: NonNullable<QueryResolvers['tasks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const limit = args.limit ?? 7;
  const offset = args.offset ?? 0;
  const rows = await db.listTasks(userEmail, args.status, limit, offset);
  return rows as any;
};
