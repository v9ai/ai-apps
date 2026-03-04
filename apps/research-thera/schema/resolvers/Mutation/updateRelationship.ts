import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateRelationship: NonNullable<MutationResolvers['updateRelationship']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateRelationship(args.id, userEmail, {
    relationshipType: args.input.relationshipType ?? undefined,
    context: args.input.context ?? undefined,
    startDate: args.input.startDate ?? undefined,
    status: args.input.status ?? undefined,
  });

  const item = await d1Tools.getRelationship(args.id, userEmail);
  if (!item) {
    throw new Error("Relationship not found after update");
  }

  return {
    id: item.id,
    createdBy: item.userId,
    subjectType: item.subjectType as any,
    subjectId: item.subjectId,
    relatedType: item.relatedType as any,
    relatedId: item.relatedId,
    relationshipType: item.relationshipType,
    context: item.context,
    startDate: item.startDate,
    status: item.status as any,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  } as any;
};
