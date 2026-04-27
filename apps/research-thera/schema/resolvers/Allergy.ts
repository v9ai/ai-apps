import type { AllergyResolvers } from "./../types.generated";

export const Allergy: AllergyResolvers = {
  familyMember: async (parent, _args, ctx) => {
    if (!parent.familyMemberId) return null;
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    return (fm as any) ?? null;
  },
};
