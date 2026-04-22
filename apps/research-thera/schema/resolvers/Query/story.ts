import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db, getStory } from "@/src/db";

export const story: NonNullable<QueryResolvers['story']> = async (
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

  const story = await getStory(args.id);
  if (!story) return null;

  // Story ownership via createdBy (user_id column). Legacy rows may have NULL.
  if (story.createdBy != null && story.createdBy !== userEmail) return null;

  // If attached to a goal, verify goal ownership as well.
  if (story.goalId) {
    try {
      await db.getGoal(story.goalId, userEmail);
    } catch {
      return null;
    }
  }

  return { ...story, segments: [], audioAssets: [] } as any;
};
