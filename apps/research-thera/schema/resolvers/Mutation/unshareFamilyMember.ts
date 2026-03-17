import type { MutationResolvers } from "./../../types.generated";
import { getFamilyMember, unshareFamilyMember as _unshareFamilyMember } from "@/src/db";

export const unshareFamilyMember: NonNullable<MutationResolvers['unshareFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const member = await getFamilyMember(args.familyMemberId);
  if (!member) throw new Error("Family member not found");
  if (member.userId !== userEmail) throw new Error("Only the owner can manage shares");

  return _unshareFamilyMember(args.familyMemberId, args.email);
};
