import type { QueryResolvers, GameType, GameSource } from "./../../types.generated";
import { db } from "@/src/db";

export const games: NonNullable<QueryResolvers['games']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const list = await db.listGames({
    userId: userEmail,
    type: args.type ?? undefined,
    goalId: args.goalId ?? undefined,
    issueId: args.issueId ?? undefined,
    familyMemberId: args.familyMemberId ?? undefined,
  });

  return list.map((g) => ({
    ...g,
    type: g.type as GameType,
    source: g.source as GameSource,
    goal: null,
    issue: null,
    completions: [],
  }));
};
