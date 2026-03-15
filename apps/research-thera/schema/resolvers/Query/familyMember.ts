import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

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
    member = await d1Tools.getFamilyMemberBySlug(args.slug, userEmail);
  } else if (args.id) {
    member = await d1Tools.getFamilyMember(args.id);
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
