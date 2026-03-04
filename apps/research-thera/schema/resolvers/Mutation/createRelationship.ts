import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createRelationship: NonNullable<MutationResolvers['createRelationship']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createRelationship({
    userId: userEmail,
    subjectType: args.input.subjectType,
    subjectId: args.input.subjectId,
    relatedType: args.input.relatedType,
    relatedId: args.input.relatedId,
    relationshipType: args.input.relationshipType,
    context: args.input.context ?? null,
    startDate: args.input.startDate ?? null,
    status: args.input.status ?? "ACTIVE",
  });

  const item = await d1Tools.getRelationship(id, userEmail);
  if (!item) {
    throw new Error("Failed to retrieve created relationship");
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
