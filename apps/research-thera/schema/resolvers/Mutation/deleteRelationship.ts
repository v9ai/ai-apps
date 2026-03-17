import type { MutationResolvers } from "./../../types.generated";
import { deleteRelationship as _deleteRelationship } from "@/src/db";

export const deleteRelationship: NonNullable<MutationResolvers['deleteRelationship']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteRelationship(args.id, userEmail);

  return {
    success: true,
    message: "Relationship deleted successfully",
  };
};
