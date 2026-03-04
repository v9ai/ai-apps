import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateFamilyMember: NonNullable<MutationResolvers['updateFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateFamilyMember(args.id, {
    firstName: args.input.firstName ?? undefined,
    name: args.input.name,
    ageYears: args.input.ageYears,
    relationship: args.input.relationship,
    dateOfBirth: args.input.dateOfBirth,
    bio: args.input.bio,
    email: args.input.email,
    phone: args.input.phone,
    location: args.input.location,
    occupation: args.input.occupation,
  });

  const member = await d1Tools.getFamilyMember(args.id);
  if (!member) throw new Error("Family member not found");

  return {
    ...member,
    goals: [],
    shares: [],
  } as any;
};
