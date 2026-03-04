import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const behaviorObservations: NonNullable<QueryResolvers['behaviorObservations']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const observations = await d1Tools.getBehaviorObservationsForFamilyMember(
    args.familyMemberId,
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
};
