import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteTeacherFeedback: NonNullable<MutationResolvers['deleteTeacherFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteTeacherFeedback(args.id, userEmail);

  return {
    success: true,
    message: "Teacher feedback deleted successfully",
  };
};
