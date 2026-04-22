import type { QueryResolvers } from "./../../types.generated";
import { getDiscussionGuidePublic, getJournalEntryPublic } from "@/src/db";

export const publicDiscussionGuide: NonNullable<QueryResolvers['publicDiscussionGuide']> = async (
  _parent,
  args,
) => {
  const entry = await getJournalEntryPublic(args.journalEntryId);
  if (!entry) return null;

  const guide = await getDiscussionGuidePublic(args.journalEntryId);

  return {
    entryTitle: entry.title ?? null,
    familyMemberName: entry.familyMemberFirstName ?? entry.familyMemberName ?? null,
    guide: (guide as any) ?? null,
  };
};
