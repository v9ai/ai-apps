import type { MutationResolvers } from "./../../types.generated";
import { createTeacherFeedback as _createTeacherFeedback, getTeacherFeedback } from "@/src/db";

export const createTeacherFeedback: NonNullable<MutationResolvers['createTeacherFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await _createTeacherFeedback({
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    teacherName: args.input.teacherName,
    subject: args.input.subject ?? null,
    feedbackDate: args.input.feedbackDate,
    content: args.input.content,
    tags: args.input.tags ?? null,
    source: args.input.source ?? null,
  });

  const fb = await getTeacherFeedback(id, userEmail);

  if (!fb) {
    throw new Error("Failed to retrieve created teacher feedback");
  }

  return {
    id: fb.id,
    familyMemberId: fb.familyMemberId,
    createdBy: fb.userId,
    teacherName: fb.teacherName,
    subject: fb.subject,
    feedbackDate: fb.feedbackDate,
    content: fb.content,
    tags: fb.tags,
    source: fb.source as any,
    extracted: fb.extracted,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  } as any;
};
