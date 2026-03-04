import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const mySharedFamilyMembers: NonNullable<QueryResolvers['mySharedFamilyMembers']> = async (_parent, _args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const members = await d1Tools.getSharedFamilyMembers(userEmail);
  return members.map((m) => ({ ...m, goals: [], shares: [] })) as any;
};
