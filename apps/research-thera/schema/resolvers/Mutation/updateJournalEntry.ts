import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateJournalEntry: NonNullable<MutationResolvers['updateJournalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateJournalEntry(args.id, userEmail, {
    familyMemberId: args.input.familyMemberId ?? undefined,
    title: args.input.title ?? undefined,
    content: args.input.content ?? undefined,
    mood: args.input.mood ?? undefined,
    moodScore: args.input.moodScore ?? undefined,
    tags: args.input.tags ?? undefined,
    goalId: args.input.goalId ?? undefined,
    isPrivate: args.input.isPrivate ?? undefined,
    entryDate: args.input.entryDate ?? undefined,
  });

  const entry = await d1Tools.getJournalEntry(args.id, userEmail);

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
    entryDate: entry.entryDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  } as any;
};
