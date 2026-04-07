import type { QueryResolvers } from "./../../types.generated";
import { listTherapyResearch } from "@/src/db";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  _ctx,
) => {
  return listTherapyResearch(
    args.goalId ?? undefined,
    args.issueId ?? undefined,
    args.feedbackId ?? undefined,
    args.journalEntryId ?? undefined,
  );
};
