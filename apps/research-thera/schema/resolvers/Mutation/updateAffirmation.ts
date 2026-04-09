import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateAffirmation: NonNullable<MutationResolvers['updateAffirmation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { input } = args;
  await db.updateAffirmation(args.id, userEmail, {
    text: input.text ?? null,
    category: input.category?.toLowerCase() ?? null,
    isActive: input.isActive ?? null,
  });

  const affirmation = await db.getAffirmation(args.id, userEmail);
  if (!affirmation) throw new Error("Affirmation not found");

  return {
    ...affirmation,
    category: affirmation.category.toUpperCase() as any,
  };
};
