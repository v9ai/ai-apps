import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteFamilyMemberCharacteristic: NonNullable<MutationResolvers['deleteFamilyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteCharacteristic(args.id, userEmail);

  return {
    success: true,
    message: "Characteristic deleted successfully",
  };
};
