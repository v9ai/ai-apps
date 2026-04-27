import type { DeepIssueAnalysisResolvers } from './../types.generated';
import { getIssue } from "@/src/db";

export const DeepIssueAnalysis: DeepIssueAnalysisResolvers = {
  familyMember: async (parent, _args, ctx) => {
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  triggerIssue: async (parent) => {
    if (!parent.triggerIssueId) return null;
    const issue = await getIssue(parent.triggerIssueId, parent.createdBy);
    if (!issue) return null;
    return { ...issue, createdBy: issue.userId } as any;
  },
};
