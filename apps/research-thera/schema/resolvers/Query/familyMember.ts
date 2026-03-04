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

  const member = await d1Tools.getFamilyMember(args.id);
  if (!member) return null;

  return {
    ...member,
    goals: [],
    shares: [],
  } as any;
};
