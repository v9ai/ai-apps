import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteContact: NonNullable<MutationResolvers['deleteContact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteContact(args.id, userEmail);

  return {
    success: true,
    message: "Contact deleted successfully",
  };
};
