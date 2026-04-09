import type { FamilyMemberResolvers } from "./../types.generated";
import { listGoals, getFamilyMemberShares, getBehaviorObservationsForFamilyMember, getTeacherFeedbacksForFamilyMember, getIssuesForFamilyMember, getRelationshipsForPerson, listAffirmations } from "@/src/db";

export const FamilyMember: FamilyMemberResolvers = {
  goals: async (parent, _args, _ctx) => {
    const goals = await listGoals(parent.userId, parent.id);
    return goals.map((goal) => ({
      ...goal,
      questions: [],
      stories: [],
      notes: [],
      research: [],
    })) as any;
  },
  shares: async (parent, _args, _ctx) => {
    const shares = await getFamilyMemberShares(parent.id);
    return shares.map((s) => ({ ...s, role: s.role as any }));
  },
  behaviorObservations: async (parent, args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const observations = await getBehaviorObservationsForFamilyMember(
      parent.id,
      userEmail,
      args.goalId ?? undefined,
    );
    return observations.map((obs) => ({
      id: obs.id,
      familyMemberId: obs.familyMemberId,
      goalId: obs.goalId,
      createdBy: obs.userId,
      observedAt: obs.observedAt,
      observationType: obs.observationType as any,
      frequency: obs.frequency,
      intensity: obs.intensity as any,
      context: obs.context,
      notes: obs.notes,
      createdAt: obs.createdAt,
      updatedAt: obs.updatedAt,
    })) as any;
  },
  teacherFeedbacks: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const feedbacks = await getTeacherFeedbacksForFamilyMember(
      parent.id,
      userEmail,
    );
    return feedbacks.map((fb) => ({
      id: fb.id,
      familyMemberId: fb.familyMemberId,
      createdBy: fb.userId,
      teacherName: fb.teacherName,
      subject: fb.subject,
      feedbackDate: fb.feedbackDate,
      content: fb.content,
      tags: fb.tags,
      source: fb.source as any,
      extracted: fb.extracted,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt,
    })) as any;
  },
  issues: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const issues = await getIssuesForFamilyMember(parent.id, undefined, userEmail);
    return issues.map((issue) => ({
      id: issue.id,
      feedbackId: issue.feedbackId,
      familyMemberId: issue.familyMemberId,
      createdBy: issue.userId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      recommendations: issue.recommendations,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    })) as any;
  },
  relationships: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const items = await getRelationshipsForPerson(userEmail, "FAMILY_MEMBER", parent.id);
    return items.map((item) => ({
      id: item.id,
      createdBy: item.userId,
      subjectType: item.subjectType as any,
      subjectId: item.subjectId,
      relatedType: item.relatedType as any,
      relatedId: item.relatedId,
      relationshipType: item.relationshipType,
      context: item.context,
      startDate: item.startDate,
      status: item.status as any,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      related: item.related ? { ...item.related, type: item.related.type as any } : null,
    })) as any;
  },
  affirmations: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const items = await listAffirmations(parent.id, userEmail);
    return items.map((item) => ({
      ...item,
      category: item.category.toUpperCase() as any,
    }));
  },
};
