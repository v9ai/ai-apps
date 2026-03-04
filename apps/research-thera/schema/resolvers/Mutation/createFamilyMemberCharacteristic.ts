import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createFamilyMemberCharacteristic: NonNullable<MutationResolvers['createFamilyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createCharacteristic({
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    category: args.input.category,
    title: args.input.title,
    description: args.input.description ?? null,
    severity: args.input.severity ?? null,
    frequencyPerWeek: args.input.frequencyPerWeek ?? null,
    durationWeeks: args.input.durationWeeks ?? null,
    ageOfOnset: args.input.ageOfOnset ?? null,
    impairmentDomains: (args.input.impairmentDomains as string[]) ?? null,
    formulationStatus: args.input.formulationStatus ?? undefined,
    externalizedName: args.input.externalizedName ?? null,
    strengths: args.input.strengths ?? null,
    riskTier: args.input.riskTier ?? undefined,
  });

  const item = await d1Tools.getCharacteristic(id, userEmail);
  if (!item) {
    throw new Error("Failed to retrieve created characteristic");
  }

  return {
    ...item,
    createdBy: item.userId,
    category: item.category as any,
  } as any;
};
