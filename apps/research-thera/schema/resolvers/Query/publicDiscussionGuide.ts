import type { QueryResolvers } from "./../../types.generated";
import { getDiscussionGuidePublic, getJournalEntryPublic } from "@/src/db";

export const publicDiscussionGuide: NonNullable<QueryResolvers['publicDiscussionGuide']> = async (
  _parent,
  args,
) => {
  const guide = await getDiscussionGuidePublic(args.journalEntryId);
  if (!guide) return null;

  const entry = await getJournalEntryPublic(args.journalEntryId);

  return {
    entryTitle: entry?.title ?? null,
    familyMemberName: entry?.familyMemberFirstName ?? entry?.familyMemberName ?? null,
    guide: guide as any,
  };
};
