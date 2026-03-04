import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteRelationship: NonNullable<MutationResolvers['deleteRelationship']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteRelationship(args.id, userEmail);

  return {
    success: true,
    message: "Relationship deleted successfully",
  };
};
