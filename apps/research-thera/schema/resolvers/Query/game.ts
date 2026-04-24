import type { QueryResolvers, GameType, GameSource } from "./../../types.generated";
import { db } from "@/src/db";

export const game: NonNullable<QueryResolvers['game']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const g = await db.getGame(args.id, userEmail);
  if (!g) return null;

  return {
    ...g,
    type: g.type as GameType,
    source: g.source as GameSource,
    goal: null,
    issue: null,
    completions: [],
  };
};
