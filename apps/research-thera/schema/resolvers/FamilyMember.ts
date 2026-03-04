import type { FamilyMemberResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const FamilyMember: FamilyMemberResolvers = {
  goals: async (parent, _args, _ctx) => {
    const goals = await d1Tools.listGoals(parent.userId, parent.id);
    return goals.map((goal) => ({
      ...goal,
      questions: [],
      stories: [],
      userStories: [],
      notes: [],
      research: [],
    })) as any;
  },
  shares: async (parent, _args, _ctx) => {
    const shares = await d1Tools.getFamilyMemberShares(parent.id);
    return shares.map((s) => ({ ...s, role: s.role as any }));
  },
  behaviorObservations: async (parent, args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    const observations = await d1Tools.getBehaviorObservationsForFamilyMember(
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
};
