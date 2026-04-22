import type { MutationResolvers } from "./../../types.generated";
import { updateJournalEntry as _updateJournalEntry, getJournalEntry } from "@/src/db";

export const updateJournalEntry: NonNullable<MutationResolvers['updateJournalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const existing = await getJournalEntry(args.id, userEmail);
  if (!existing) {
    throw new Error("Journal entry not found");
  }
  if ((existing.isVault || args.input.isVault === true) && !ctx.vaultUnlocked) {
    throw new Error("Journal entry not found");
  }

  await _updateJournalEntry(args.id, userEmail, {
    familyMemberId: args.input.familyMemberId ?? undefined,
    title: args.input.title ?? undefined,
    content: args.input.content ?? undefined,
    mood: args.input.mood ?? undefined,
    moodScore: args.input.moodScore ?? undefined,
    tags: args.input.tags ?? undefined,
    goalId: args.input.goalId ?? undefined,
    isPrivate: args.input.isPrivate ?? undefined,
    isVault: args.input.isVault ?? undefined,
    entryDate: args.input.entryDate ?? undefined,
  });

  const entry = await getJournalEntry(args.id, userEmail);

  if (!entry) {
    throw new Error("Journal entry not found after update");
  }

  return {
    id: entry.id,
    createdBy: entry.userId,
    familyMemberId: entry.familyMemberId,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    moodScore: entry.moodScore,
    tags: entry.tags,
    goalId: entry.goalId,
    isPrivate: entry.isPrivate,
    isVault: entry.isVault,
    entryDate: entry.entryDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  } as any;
};
