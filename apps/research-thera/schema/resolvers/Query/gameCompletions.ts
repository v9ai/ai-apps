import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const gameCompletions: NonNullable<QueryResolvers['gameCompletions']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.listGameCompletions(args.gameId, userEmail);
};
