import type { BehaviorObservationResolvers } from './../types.generated';
import { d1Tools } from "@/src/db";

export const BehaviorObservation: BehaviorObservationResolvers = {
  familyMember: async (parent) => {
    const fm = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    try {
      const goal = await d1Tools.getGoal(parent.goalId, userEmail);
      return goal as any;
    } catch {
      return null;
    }
  },
};
