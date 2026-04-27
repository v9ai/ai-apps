import type { DeepAnalysisResolvers } from './../types.generated';
import { getNoteById, getJournalEntry } from "@/src/db";

export const DeepAnalysis: DeepAnalysisResolvers = {
  goal: async (parent, _args, ctx) => {
    if (parent.subjectType !== "GOAL") return null;
    const g = await ctx.loaders.goal.load(parent.subjectId);
    if (!g) return null;
    if (g.userId !== parent.createdBy) return null;
    return g as any;
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
  familyMember: async (parent, _args, ctx) => {
    if (parent.subjectType !== "FAMILY_MEMBER") return null;
    const fm = await ctx.loaders.familyMember.load(parent.subjectId);
    return (fm ?? null) as any;
  },
};
