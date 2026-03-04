import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const shareFamilyMember: NonNullable<MutationResolvers['shareFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const member = await d1Tools.getFamilyMember(args.familyMemberId);
  if (!member) throw new Error("Family member not found");
  if (member.userId !== userEmail) throw new Error("Only the owner can share a family member");

  const share = await d1Tools.shareFamilyMember(
    args.familyMemberId,
    args.email,
    args.role ?? "VIEWER",
    userEmail,
  );

  return {
    ...share,
    role: share.role as any,
  };
};
