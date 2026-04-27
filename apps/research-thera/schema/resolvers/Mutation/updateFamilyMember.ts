import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateFamilyMember: NonNullable<MutationResolvers['updateFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Ownership check: verifies the family_member exists and belongs to the
  // caller before running the UPDATE (which itself is also user-scoped).
  await db.assertOwnsFamilyMember(args.id, userEmail);

  await db.updateFamilyMember(args.id, userEmail, {
    firstName: args.input.firstName ?? undefined,
    name: args.input.name,
    ageYears: args.input.ageYears,
    relationship: args.input.relationship,
    dateOfBirth: args.input.dateOfBirth,
    bio: args.input.bio,
    allergies: args.input.allergies,
    email: args.input.email,
    phone: args.input.phone,
    location: args.input.location,
    occupation: args.input.occupation,
  });

  const member = await db.getFamilyMember(args.id);
  if (!member) throw new Error("Family member not found");

  return {
    ...member,
    goals: [],
    shares: [],
  } as any;
};
