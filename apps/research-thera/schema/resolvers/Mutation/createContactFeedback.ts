import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createContactFeedback: NonNullable<MutationResolvers['createContactFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createContactFeedback({
    contactId: args.input.contactId,
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    subject: args.input.subject ?? null,
    feedbackDate: args.input.feedbackDate,
    content: args.input.content,
    tags: args.input.tags ?? null,
    source: args.input.source ?? null,
  });

  const fb = await d1Tools.getContactFeedback(id, userEmail);

  if (!fb) {
    throw new Error("Failed to retrieve created contact feedback");
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
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  } as any;
};
