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
    if (!member) {
      // Fall through to slug-then-share lookup: find a shared member whose slug matches.
      const allShared = await db.getSharedFamilyMembers(userEmail);
      member = allShared.find((m) => m.slug === args.slug) ?? null;
    }
  } else if (args.id) {
    member = await db.getFamilyMember(args.id);
    if (!member) return null;
    if (member.userId !== userEmail) {
      const canAccess = await db.hasFamilyMemberAccess(member.id, userEmail);
      if (!canAccess) return null;
    }
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
