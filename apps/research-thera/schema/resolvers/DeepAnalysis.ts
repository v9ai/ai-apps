import type { DeepAnalysisResolvers } from './../types.generated';
import { getGoal, getNoteById, getJournalEntry, getFamilyMember } from "@/src/db";

export const DeepAnalysis: DeepAnalysisResolvers = {
  goal: async (parent) => {
    if (parent.subjectType !== "GOAL") return null;
    try {
      const g = await getGoal(parent.subjectId, parent.createdBy);
      return g as any;
    } catch {
      return null;
    }
  },
  note: async (parent) => {
    if (parent.subjectType !== "NOTE") return null;
    const n = await getNoteById(parent.subjectId, parent.createdBy);
    return (n ?? null) as any;
  },
  journalEntry: async (parent) => {
    if (parent.subjectType !== "JOURNAL_ENTRY") return null;
    const j = await getJournalEntry(parent.subjectId, parent.createdBy);
    return (j ?? null) as any;
  },
  familyMember: async (parent) => {
    if (parent.subjectType !== "FAMILY_MEMBER") return null;
    const fm = await getFamilyMember(parent.subjectId);
    return (fm ?? null) as any;
  },
};
