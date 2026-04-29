import type { MutationResolvers } from "./../../types.generated";
import { suggestCategorization } from "@/src/lib/ai/tasks";

export const suggestTaskCategorization: NonNullable<MutationResolvers['suggestTaskCategorization']> = async (_parent, args, ctx) => {
  if (!ctx.userEmail) throw new Error("Authentication required");
  const result = await suggestCategorization(args.title, args.description ?? null);
  return result ?? null;
};
