import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateBehaviorObservation: NonNullable<MutationResolvers['updateBehaviorObservation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateBehaviorObservation(args.id, userEmail, {
    observedAt: args.input.observedAt ?? undefined,
    observationType: args.input.observationType ?? undefined,
    frequency: args.input.frequency ?? undefined,
    intensity: args.input.intensity ?? undefined,
    context: args.input.context ?? undefined,
    notes: args.input.notes ?? undefined,
  });

  const obs = await d1Tools.getBehaviorObservation(args.id, userEmail);

  if (!obs) {
    throw new Error("Behavior observation not found after update");
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
