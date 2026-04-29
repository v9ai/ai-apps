import type { ConditionResolvers } from "./../types.generated";

export const Condition: ConditionResolvers = {
  familyMember: async (parent, _args, ctx) => {
    if (!parent.familyMemberId) return null;
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    return (fm as any) ?? null;
  },
  diagnosingDoctor: async (parent, _args, ctx) => {
    if (!parent.diagnosingDoctorId) return null;
    const doc = await ctx.loaders.doctor.load(String(parent.diagnosingDoctorId));
    return (doc as any) ?? null;
  },
};
