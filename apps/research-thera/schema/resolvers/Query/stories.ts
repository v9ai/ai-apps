import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";

export const stories: NonNullable<QueryResolvers['stories']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  try {
    await db.getGoal(args.goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return db.listStories(args.goalId) as any;
};
