import type { QueryResolvers } from "./../../types.generated";
import { listTherapeuticQuestions } from "@/src/db";

export const therapeuticQuestions: NonNullable<QueryResolvers['therapeuticQuestions']> = async (_parent, args, _ctx) => {
  return listTherapeuticQuestions(args.goalId);
};
