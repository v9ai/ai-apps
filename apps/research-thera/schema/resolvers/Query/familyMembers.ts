import type { QueryResolvers } from "./../../types.generated";
import { listFamilyMembers, createFamilyMember } from "@/src/db";

export const familyMembers: NonNullable<QueryResolvers['familyMembers']> = async (_parent, _arg, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  let members = await listFamilyMembers(userEmail);

  // Auto-create "self" member on first access
  if (!members.some((m) => m.relationship === "self")) {
    const firstName = ctx.userName?.split(" ")[0] ?? "Me";
    const lastName = ctx.userName?.split(" ").slice(1).join(" ") || null;
    await createFamilyMember({
      userId: userEmail,
      firstName,
      name: lastName,
      relationship: "self",
    });
    members = await listFamilyMembers(userEmail);
  }

  return members.map((m) => ({
    ...m,
    goals: [],
    shares: [],
  })) as any;
};
