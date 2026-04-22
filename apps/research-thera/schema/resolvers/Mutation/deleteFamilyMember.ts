import type { MutationResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";

export const deleteFamilyMember: NonNullable<MutationResolvers['deleteFamilyMember']> = async (_parent, args, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  try {
    await neonSql`DELETE FROM family_members WHERE id = ${args.id} AND user_id = ${userId}`;

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
