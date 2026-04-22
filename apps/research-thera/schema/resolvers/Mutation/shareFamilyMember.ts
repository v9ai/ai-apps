import type { MutationResolvers } from "./../../types.generated";
import { getFamilyMember, shareFamilyMember as _shareFamilyMember } from "@/src/db";

export const shareFamilyMember: NonNullable<MutationResolvers['shareFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const member = await getFamilyMember(args.familyMemberId);
  if (!member) throw new Error("Family member not found");
  if (member.userId !== userEmail) throw new Error("Only the owner can share a family member");

  const share = await _shareFamilyMember(
    args.familyMemberId,
    args.email,
    args.role ?? "EDITOR",
    userEmail,
  );

  return {
    ...share,
    role: share.role as any,
  };
};
