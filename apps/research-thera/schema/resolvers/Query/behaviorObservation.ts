import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const behaviorObservation: NonNullable<QueryResolvers['behaviorObservation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const obs = await d1Tools.getBehaviorObservation(args.id, userEmail);

  if (!obs) {
    return null;
  }

  return {
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
  } as any;
};
