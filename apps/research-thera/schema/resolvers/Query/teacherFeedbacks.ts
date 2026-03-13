import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const teacherFeedbacks: NonNullable<QueryResolvers['teacherFeedbacks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const feedbacks = await d1Tools.getTeacherFeedbacksForFamilyMember(
    args.familyMemberId,
    userEmail,
  );

  return feedbacks.map((fb) => ({
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
  })) as any;
};
