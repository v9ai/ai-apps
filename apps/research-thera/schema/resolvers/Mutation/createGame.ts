import type { MutationResolvers, GameType, GameSource } from "./../../types.generated";
import { db } from "@/src/db";

export const createGame: NonNullable<MutationResolvers['createGame']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { input } = args;

  if (input.familyMemberId != null) {
    await db.assertOwnsFamilyMember(input.familyMemberId, userEmail);
  }
  if (input.goalId != null) {
    await db.assertOwnsGoal(input.goalId, userEmail);
  }

  const id = await db.createGame({
    userId: userEmail,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    content: input.content,
    goalId: input.goalId ?? null,
    issueId: input.issueId ?? null,
    familyMemberId: input.familyMemberId ?? null,
    language: input.language ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    source: "USER",
  });

  const g = await db.getGame(id, userEmail);
  if (!g) throw new Error("Game not found after creation");

  return {
    ...g,
    type: g.type as GameType,
    source: g.source as GameSource,
    goal: null,
    issue: null,
    completions: [],
  };
};
