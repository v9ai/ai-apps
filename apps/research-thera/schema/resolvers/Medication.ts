import type { MedicationResolvers } from "./../types.generated";

export const Medication: MedicationResolvers = {
  familyMember: async (parent, _args, ctx) => {
    if (!parent.familyMemberId) return null;
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    return (fm as any) ?? null;
  },
};
