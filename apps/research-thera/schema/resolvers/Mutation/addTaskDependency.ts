import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addTaskDependency: NonNullable<MutationResolvers['addTaskDependency']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.addTaskDependency(
    args.blockingTaskId as string,
    args.blockedTaskId as string,
    userEmail,
  );
  return true;
};
