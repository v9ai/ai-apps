import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createUniqueOutcome: NonNullable<MutationResolvers['createUniqueOutcome']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createUniqueOutcome({
    issueId: args.input.issueId,
    userId: userEmail,
    observedAt: args.input.observedAt,
    description: args.input.description,
  });

  const item = await d1Tools.getUniqueOutcome(id, userEmail);
  if (!item) {
    throw new Error("Failed to retrieve created unique outcome");
  }

  return {
    ...item,
    createdBy: item.userId,
  } as any;
};
