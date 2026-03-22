import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const contactFeedback: NonNullable<QueryResolvers['contactFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const fb = await db.getContactFeedback(args.id, userEmail);

  if (!fb) {
    return null;
  }

  return {
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
  } as any;
};
