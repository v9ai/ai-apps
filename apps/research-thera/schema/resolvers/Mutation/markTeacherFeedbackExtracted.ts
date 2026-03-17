import type { MutationResolvers } from "./../../types.generated";
import { markTeacherFeedbackExtracted as _markTeacherFeedbackExtracted, getTeacherFeedback } from "@/src/db";

export const markTeacherFeedbackExtracted: NonNullable<MutationResolvers['markTeacherFeedbackExtracted']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _markTeacherFeedbackExtracted(args.id, userEmail);

  const fb = await getTeacherFeedback(args.id, userEmail);

  if (!fb) {
    throw new Error("Teacher feedback not found after marking as extracted");
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
