import type { BehaviorObservationResolvers } from './../types.generated';

export const BehaviorObservation: BehaviorObservationResolvers = {
  familyMember: async (parent, _args, ctx) => {
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const goal = await ctx.loaders.goal.load(parent.goalId);
    if (!goal) return null;
    // Honor the original ownership check: hide goals not owned by the caller.
    if (ctx.userEmail && goal.userId !== ctx.userEmail) return null;
    return goal as any;
  },
};
