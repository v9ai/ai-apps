import type { IssueResolvers } from './../types.generated';
import { getContactFeedback, getContactsForIssue, getFamilyMember, getJournalEntry, getLinkedIssues, listConversationsForIssue, listStoriesForIssue, listTherapeuticQuestions } from "@/src/db";

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
  contacts: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const rows = await getContactsForIssue(parent.id, userEmail);
    return rows.map((c) => ({
      id: c.id,
      createdBy: c.userId,
      slug: c.slug,
      firstName: c.firstName,
      lastName: c.lastName,
      role: c.role,
      ageYears: c.ageYears,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })) as any;
  },
  conversations: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const rows = await listConversationsForIssue(parent.id, userEmail);
    return rows as any;
  },
  relatedIssues: async (parent) => {
    const links = await getLinkedIssues(parent.id, parent.createdBy);
    return links.map((l) => ({
      id: l.linkId,
      linkType: l.linkType,
      issue: {
        id: l.issue.id,
        feedbackId: l.issue.feedbackId,
        journalEntryId: l.issue.journalEntryId,
        familyMemberId: l.issue.familyMemberId,
        relatedFamilyMemberId: l.issue.relatedFamilyMemberId,
        createdBy: l.issue.userId,
        title: l.issue.title,
        description: l.issue.description,
        category: l.issue.category,
        severity: l.issue.severity,
        recommendations: l.issue.recommendations,
        createdAt: l.issue.createdAt,
        updatedAt: l.issue.updatedAt,
      },
    })) as any;
  },
};
