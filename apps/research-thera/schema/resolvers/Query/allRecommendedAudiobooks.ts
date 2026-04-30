import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { listAllRecommendedAudiobooks } from "@/src/db";

export const allRecommendedAudiobooks: NonNullable<QueryResolvers['allRecommendedAudiobooks']> = async (
  _parent,
  args,
  ctx,
) => {
  if (!ctx.userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return listAllRecommendedAudiobooks({
    category: args.category ?? undefined,
    familyMemberId: args.familyMemberId ?? undefined,
  });
};
