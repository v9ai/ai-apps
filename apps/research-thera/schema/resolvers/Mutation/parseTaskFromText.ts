import type { MutationResolvers } from "./../../types.generated";
import { parseNaturalLanguageTask } from "@/src/lib/ai/tasks";

export const parseTaskFromText: NonNullable<MutationResolvers['parseTaskFromText']> = async (
  _parent,
  args,
  ctx,
) => {
  if (!ctx.userEmail) throw new Error("Authentication required");
  const result = await parseNaturalLanguageTask(args.input);
  if (!result) return null;
  return {
    title: result.title,
    dueDate: result.dueDate ?? null,
    estimatedMinutes: result.estimatedMinutes ?? null,
    energyPreference: result.energyPreference ?? null,
  };
};
