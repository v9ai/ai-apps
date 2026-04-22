import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { sql as neonSql } from "@/src/db/neon";

export const generateAudio: NonNullable<MutationResolvers['generateAudio']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const { goalId, storyId } = args;

  // Ownership check: verify the goal belongs to the caller.
  // goals.user_id is email-keyed (see getGoal / deleteGoal).
  const goalRows = await neonSql`
    SELECT id FROM goals WHERE id = ${goalId} AND user_id = ${userEmail}
  `;
  if (goalRows.length === 0) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  // If a storyId is provided, verify that the story belongs to the caller
  // and is attached to the same goal. stories.user_id may be email-keyed
  // (see createStory / deleteStory which use userEmail) or legacy NULL.
  if (storyId != null) {
    const storyRows = await neonSql`
      SELECT id FROM stories
      WHERE id = ${storyId}
        AND goal_id = ${goalId}
        AND (user_id = ${userEmail} OR user_id IS NULL)
    `;
    if (storyRows.length === 0) {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
  }

  throw new Error("generateAudio resolver not implemented");
};
