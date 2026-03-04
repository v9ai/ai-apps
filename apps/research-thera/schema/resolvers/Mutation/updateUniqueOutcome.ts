import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateUniqueOutcome: NonNullable<MutationResolvers['updateUniqueOutcome']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateUniqueOutcome(args.id, userEmail, {
    observedAt: args.input.observedAt ?? undefined,
    description: args.input.description ?? undefined,
  });

  const item = await d1Tools.getUniqueOutcome(args.id, userEmail);
  if (!item) {
    throw new Error("Unique outcome not found");
  }

  return {
    ...item,
    createdBy: item.userId,
  } as any;
};
