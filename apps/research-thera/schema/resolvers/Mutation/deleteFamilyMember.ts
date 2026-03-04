import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

export const deleteFamilyMember: NonNullable<MutationResolvers['deleteFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  try {
    await d1.execute({
      sql: `DELETE FROM family_members WHERE id = ? AND user_id = ?`,
      args: [args.id, userEmail],
    });

    return {
      success: true,
      message: "Family member deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete family member",
    };
  }
};
