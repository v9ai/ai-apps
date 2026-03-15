import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  _ctx,
) => {
  return d1Tools.listTherapyResearch(
    args.goalId ?? undefined,
    args.issueId ?? undefined,
    args.feedbackId ?? undefined,
  );
};
