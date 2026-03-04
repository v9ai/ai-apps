import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const familyMemberCharacteristics: NonNullable<QueryResolvers['familyMemberCharacteristics']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const items = await d1Tools.getCharacteristicsForFamilyMember(
    args.familyMemberId,
    userEmail,
    args.category ?? undefined,
  );

  return items.map((item: typeof items[number]) => ({
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
  })) as any;
};
