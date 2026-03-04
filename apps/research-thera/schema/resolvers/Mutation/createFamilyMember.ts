import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createFamilyMember: NonNullable<MutationResolvers['createFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createFamilyMember({
    userId: userEmail,
    firstName: args.input.firstName,
    name: args.input.name ?? null,
    ageYears: args.input.ageYears ?? null,
    relationship: args.input.relationship ?? null,
    dateOfBirth: args.input.dateOfBirth ?? null,
    bio: args.input.bio ?? null,
    email: args.input.email ?? null,
    phone: args.input.phone ?? null,
    location: args.input.location ?? null,
    occupation: args.input.occupation ?? null,
  });

  const member = await d1Tools.getFamilyMember(id);
  if (!member) throw new Error("Failed to create family member");

  return {
    ...member,
    goals: [],
    shares: [],
  } as any;
};
