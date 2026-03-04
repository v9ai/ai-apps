import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const familyMemberCharacteristic: NonNullable<QueryResolvers['familyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const item = await d1Tools.getCharacteristic(args.id, userEmail);
  if (!item) return null;

  return {
    id: item.id,
    familyMemberId: item.familyMemberId,
    createdBy: item.userId,
    category: item.category as any,
    title: item.title,
    description: item.description,
    severity: item.severity,
    frequencyPerWeek: item.frequencyPerWeek,
    durationWeeks: item.durationWeeks,
    ageOfOnset: item.ageOfOnset,
    impairmentDomains: item.impairmentDomains,
    formulationStatus: item.formulationStatus as any,
    externalizedName: item.externalizedName,
    strengths: item.strengths,
    riskTier: item.riskTier as any,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  } as any;
};
