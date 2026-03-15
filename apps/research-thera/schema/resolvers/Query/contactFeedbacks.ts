import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const contactFeedbacks: NonNullable<QueryResolvers['contactFeedbacks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const feedbacks = await d1Tools.getContactFeedbacks(
    args.contactId,
    args.familyMemberId,
    userEmail,
  );

  return feedbacks.map((fb) => ({
    id: fb.id,
    contactId: fb.contactId,
    familyMemberId: fb.familyMemberId,
    createdBy: fb.userId,
    subject: fb.subject,
    feedbackDate: fb.feedbackDate,
    content: fb.content,
    tags: fb.tags,
    source: fb.source as any,
    extracted: fb.extracted,
    extractedIssues: fb.extractedIssues,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  })) as any;
};
