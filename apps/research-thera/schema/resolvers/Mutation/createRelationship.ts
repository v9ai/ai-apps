import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";

async function assertPersonOwned(
  type: "FAMILY_MEMBER" | "CONTACT",
  id: number,
  userId: string,
): Promise<void> {
  if (type === "FAMILY_MEMBER") {
    const fm = await db.getFamilyMember(id);
    if (!fm || fm.userId !== userId) {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return;
  }
  if (type === "CONTACT") {
    const contact = await db.getContact(id, userId);
    if (!contact) {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return;
  }
  // Unknown PersonType — be defensive.
  throw new GraphQLError("Not found", {
    extensions: { code: "NOT_FOUND" },
  });
}

export const createRelationship: NonNullable<MutationResolvers['createRelationship']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  await assertPersonOwned(args.input.subjectType, args.input.subjectId, userId);
  await assertPersonOwned(args.input.relatedType, args.input.relatedId, userId);

  const id = await db.createRelationship({
    userId,
    subjectType: args.input.subjectType,
    subjectId: args.input.subjectId,
    relatedType: args.input.relatedType,
    relatedId: args.input.relatedId,
    relationshipType: args.input.relationshipType,
    context: args.input.context ?? null,
    startDate: args.input.startDate ?? null,
    status: args.input.status ?? "ACTIVE",
  });

  const item = await db.getRelationship(id, userId);
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
