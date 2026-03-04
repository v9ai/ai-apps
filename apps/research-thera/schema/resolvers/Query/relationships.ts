import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const relationships: NonNullable<QueryResolvers['relationships']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const items = await d1Tools.getRelationshipsForPerson(
    userEmail,
    args.subjectType,
    args.subjectId,
  );

  return items.map((item) => ({
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
  })) as any;
};
