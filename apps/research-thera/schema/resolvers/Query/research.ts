import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  _ctx,
) => {
  const researchList = await d1Tools.listTherapyResearch(args.goalId);
  return researchList;
};
