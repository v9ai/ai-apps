import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateFamilyMemberCharacteristic: NonNullable<MutationResolvers['updateFamilyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateCharacteristic(args.id, userEmail, {
    category: args.input.category ?? undefined,
    title: args.input.title ?? undefined,
    description: args.input.description ?? undefined,
    severity: args.input.severity ?? undefined,
    frequencyPerWeek: args.input.frequencyPerWeek ?? undefined,
    durationWeeks: args.input.durationWeeks ?? undefined,
    ageOfOnset: args.input.ageOfOnset ?? undefined,
    impairmentDomains: (args.input.impairmentDomains as string[]) ?? undefined,
    formulationStatus: args.input.formulationStatus ?? undefined,
    externalizedName: args.input.externalizedName ?? undefined,
    strengths: args.input.strengths ?? undefined,
    riskTier: args.input.riskTier ?? undefined,
  });

  const item = await d1Tools.getCharacteristic(args.id, userEmail);
  if (!item) {
    throw new Error("Characteristic not found");
  }

  return {
    ...item,
    createdBy: item.userId,
    category: item.category as any,
  } as any;
};
