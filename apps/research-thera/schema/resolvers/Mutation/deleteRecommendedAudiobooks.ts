import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import {
  deleteRecommendedAudiobooks as deleteAudiobooks,
  getGoal,
  getFamilyMember,
} from "@/src/db";

export const deleteRecommendedAudiobooks: NonNullable<MutationResolvers['deleteRecommendedAudiobooks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId, familyMemberId } = args;
  if (!goalId && !familyMemberId) {
    return {
      success: false,
      message: "goalId or familyMemberId is required",
      deletedCount: 0,
    };
  }

  if (goalId) {
    try {
      await getGoal(goalId, userEmail);
    } catch {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }
  if (familyMemberId) {
    const fm = await getFamilyMember(familyMemberId);
    if (!fm || fm.userId !== userEmail) {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }

  const deletedCount = await deleteAudiobooks({
    goalId: goalId ?? undefined,
    familyMemberId: familyMemberId ?? undefined,
  });

  return {
    success: true,
    message: `Deleted ${deletedCount} audiobook recommendation${deletedCount === 1 ? "" : "s"}.`,
    deletedCount,
  };
};
