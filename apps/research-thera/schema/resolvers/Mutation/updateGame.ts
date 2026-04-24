import type { MutationResolvers, GameType, GameSource } from "./../../types.generated";
import { db } from "@/src/db";

export const updateGame: NonNullable<MutationResolvers['updateGame']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.updateGame(args.id, userEmail, {
    title: args.input.title ?? null,
    description: args.input.description ?? null,
    content: args.input.content ?? null,
    language: args.input.language ?? null,
    estimatedMinutes: args.input.estimatedMinutes ?? null,
  });

  const g = await db.getGame(args.id, userEmail);
  if (!g) throw new Error("Game not found after update");

  return {
    ...g,
    type: g.type as GameType,
    source: g.source as GameSource,
    goal: null,
    issue: null,
    completions: [],
  };
};
