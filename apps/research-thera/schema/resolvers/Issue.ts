import type { IssueResolvers } from './../types.generated';
import { getContactFeedback, getFamilyMember, getJournalEntry, listStoriesForIssue, listTherapeuticQuestions } from "@/src/db";

export const Issue: IssueResolvers = {
  feedback: async (parent) => {
    if (!parent.feedbackId) return null;
    const feedback = await getContactFeedback(parent.feedbackId, parent.createdBy);
    if (!feedback) return null;
    return feedback as any;
  },
  journalEntry: async (parent, _args, ctx) => {
    if (!parent.journalEntryId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const entry = await getJournalEntry(parent.journalEntryId, userEmail);
    if (!entry) return null;
    return {
      id: entry.id,
      createdBy: entry.userId,
      familyMemberId: entry.familyMemberId,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      moodScore: entry.moodScore,
      tags: entry.tags,
      goalId: entry.goalId,
      isPrivate: entry.isPrivate,
      entryDate: entry.entryDate,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    } as any;
  },
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  relatedFamilyMember: async (parent) => {
    if (!parent.relatedFamilyMemberId) return null;
    const fm = await getFamilyMember(parent.relatedFamilyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  stories: async (parent) => {
    const rows = await listStoriesForIssue(parent.id);
    return rows.map((s) => ({ ...s, goal: null, issue: null, segments: [], audioAssets: [] })) as any;
  },
  questions: async (parent) => {
    return listTherapeuticQuestions(undefined, parent.id);
  },
};
