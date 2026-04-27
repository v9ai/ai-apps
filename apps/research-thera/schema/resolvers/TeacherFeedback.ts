import type { TeacherFeedbackResolvers } from './../types.generated';

export const TeacherFeedback: TeacherFeedbackResolvers = {
  familyMember: async (parent, _args, ctx) => {
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};
