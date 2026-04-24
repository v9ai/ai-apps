import type { MutationResolvers, GameType, GameSource } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateGame: NonNullable<MutationResolvers['generateGame']> = async (
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

  const result = (await runGraphAndWait("games", {
    input: {
      type: input.type,
      goal_id: input.goalId ?? null,
      issue_id: input.issueId ?? null,
      family_member_id: input.familyMemberId ?? null,
      user_email: userEmail,
      language: input.language ?? "en",
    },
  })) as { error?: string; persisted_ids?: number[] };

  if (result.error) {
    throw new Error(result.error);
  }

  const persistedIds = result.persisted_ids ?? [];
  if (persistedIds.length === 0) {
    throw new Error("Game generation returned no persisted game");
  }

  const g = await db.getGame(persistedIds[0], userEmail);
  if (!g) throw new Error("Game not found after generation");

  return {
    ...g,
    type: g.type as GameType,
    source: g.source as GameSource,
    goal: null,
    issue: null,
    completions: [],
  };
};
