import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const familyMember: NonNullable<QueryResolvers['familyMember']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  let member;

  if (args.slug) {
    // Slug path is already user-scoped in the helper.
    member = await db.getFamilyMemberBySlug(args.slug, userEmail);
  } else if (args.id) {
    // ID path leaks PII without an explicit ownership check.
    member = await db.getFamilyMember(args.id);
    if (!member || member.userId !== userEmail) return null;
  } else {
    throw new Error("Either id or slug must be provided");
  }

  if (!member) return null;

  return {
    ...member,
    goals: [],
    shares: [],
  } as any;
};
