import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const teacherFeedback: NonNullable<QueryResolvers['teacherFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const fb = await d1Tools.getTeacherFeedback(args.id, userEmail);

  if (!fb) {
    return null;
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
