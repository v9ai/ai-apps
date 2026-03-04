import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const journalEntry: NonNullable<QueryResolvers['journalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const entry = await d1Tools.getJournalEntry(args.id, userEmail);

  if (!entry) {
    return null;
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
