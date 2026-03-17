import type { MutationResolvers } from "./../../types.generated";
import { deleteTeacherFeedback as _deleteTeacherFeedback } from "@/src/db";

export const deleteTeacherFeedback: NonNullable<MutationResolvers['deleteTeacherFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteTeacherFeedback(args.id, userEmail);

  return {
    success: true,
    message: "Teacher feedback deleted successfully",
  };
};
