import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const createAffirmation: NonNullable<MutationResolvers['createAffirmation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.assertOwnsFamilyMember(args.input.familyMemberId, userEmail);

  const { input } = args;
  const id = await db.createAffirmation({
    familyMemberId: input.familyMemberId,
    userId: userEmail,
    text: input.text,
    category: input.category?.toLowerCase() ?? "encouragement",
  });

  const affirmation = await db.getAffirmation(id, userEmail);
  if (!affirmation) throw new Error("Affirmation not found after creation");

  return {
    ...affirmation,
    category: affirmation.category.toUpperCase() as any,
  };
};
