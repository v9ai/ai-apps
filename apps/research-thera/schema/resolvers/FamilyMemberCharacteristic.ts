import type { FamilyMemberCharacteristicResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const FamilyMemberCharacteristic: FamilyMemberCharacteristicResolvers = {
  familyMember: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const member = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!member) return null;
    return member as any;
  },
  uniqueOutcomes: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const outcomes = await d1Tools.getUniqueOutcomesForCharacteristic(
      parent.id,
      userEmail,
    );
    return outcomes.map((o) => ({
      ...o,
      createdBy: o.userId,
    })) as any;
  },
  behaviorObservations: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const obs = await d1Tools.getCharacteristicBehaviorObservations(
      parent.id,
      userEmail,
    );
    return obs.map((o) => ({
      ...o,
      createdBy: o.userId,
      observationType: o.observationType as any,
      intensity: o.intensity as any,
    })) as any;
  },
  impairmentDomains: (parent) => {
    if (Array.isArray((parent as any).impairmentDomains)) {
      return (parent as any).impairmentDomains;
    }
    if (typeof (parent as any).impairmentDomains === "string") {
      try {
        return JSON.parse((parent as any).impairmentDomains);
      } catch {
        return [];
      }
    }
    return [];
  },
};
