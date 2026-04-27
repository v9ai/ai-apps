import type { JournalEntryResolvers } from './../types.generated';
import { getIssueByJournalEntryId, getJournalAnalysis, getDiscussionGuide } from "@/src/db";

export const JournalEntry: JournalEntryResolvers = {
  familyMember: async (parent, _args, ctx) => {
    if (!parent.familyMemberId) return null;
    const fm = await ctx.loaders.familyMember.load(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const goal = await ctx.loaders.goal.load(parent.goalId);
    if (!goal) return null;
    if (ctx.userEmail && goal.userId !== ctx.userEmail) return null;
    return goal as any;
  },
  issue: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const issue = await getIssueByJournalEntryId(parent.id, userEmail);
    if (!issue) return null;
    return {
      id: issue.id,
      feedbackId: issue.feedbackId,
      journalEntryId: issue.journalEntryId,
      familyMemberId: issue.familyMemberId,
      createdBy: issue.userId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      recommendations: issue.recommendations,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    } as any;
  },
  analysis: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const analysis = await getJournalAnalysis(parent.id, userEmail);
    if (!analysis) return null;
    return analysis as any;
  },
  discussionGuide: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const guide = await getDiscussionGuide(parent.id, userEmail);
    if (!guide) return null;
    return guide as any;
  },
};
