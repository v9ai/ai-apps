import type { DeepIssueAnalysisResolvers } from './../types.generated';
import { getFamilyMember, getIssue } from "@/src/db";

export const DeepIssueAnalysis: DeepIssueAnalysisResolvers = {
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
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
