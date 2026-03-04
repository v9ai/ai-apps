import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createBehaviorObservation: NonNullable<MutationResolvers['createBehaviorObservation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const obsId = await d1Tools.createBehaviorObservation({
    familyMemberId: args.input.familyMemberId,
    goalId: args.input.goalId ?? null,
    characteristicId: args.input.characteristicId ?? null,
    userId: userEmail,
    observedAt: args.input.observedAt,
    observationType: args.input.observationType,
    frequency: args.input.frequency ?? null,
    intensity: args.input.intensity ?? null,
    context: args.input.context ?? null,
    notes: args.input.notes ?? null,
  });

  const obs = await d1Tools.getBehaviorObservation(obsId, userEmail);

  if (!obs) {
    throw new Error("Failed to retrieve created behavior observation");
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
