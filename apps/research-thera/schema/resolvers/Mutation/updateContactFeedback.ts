import type { MutationResolvers } from "./../../types.generated";
import { updateContactFeedback as _updateContactFeedback, getContactFeedback } from "@/src/db";

export const updateContactFeedback: NonNullable<MutationResolvers['updateContactFeedback']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _updateContactFeedback(args.id, userEmail, {
    subject: args.input.subject ?? undefined,
    feedbackDate: args.input.feedbackDate ?? undefined,
    content: args.input.content ?? undefined,
    tags: args.input.tags ?? undefined,
    source: args.input.source ?? undefined,
  });

  const fb = await getContactFeedback(args.id, userEmail);

  if (!fb) {
    throw new Error("Contact feedback not found after update");
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
