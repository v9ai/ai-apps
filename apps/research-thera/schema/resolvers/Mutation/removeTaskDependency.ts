import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const removeTaskDependency: NonNullable<MutationResolvers['removeTaskDependency']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.removeTaskDependency(
    args.blockingTaskId as string,
    args.blockedTaskId as string,
    userEmail,
  );
  return true;
};
