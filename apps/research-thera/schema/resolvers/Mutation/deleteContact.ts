import type { MutationResolvers } from "./../../types.generated";
import { deleteContact as _deleteContact } from "@/src/db";

export const deleteContact: NonNullable<MutationResolvers['deleteContact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteContact(args.id, userEmail);

  return {
    success: true,
    message: "Contact deleted successfully",
  };
};
