import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const familyMembers: NonNullable<QueryResolvers['familyMembers']> = async (_parent, _arg, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const members = await d1Tools.listFamilyMembers(userEmail);
  return members.map((m) => ({
    ...m,
    goals: [],
    shares: [],
  })) as any;
};
