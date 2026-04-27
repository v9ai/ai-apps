import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const recordCognitiveCheckIn: NonNullable<MutationResolvers['recordCognitiveCheckIn']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const owns = await db.assertOwnsProtocol(args.protocolId, userEmail);
  if (!owns) throw new Error("Protocol not found");

  return db.createCheckIn({
    protocolId: args.protocolId,
    memoryScore: args.input.memoryScore ?? null,
    focusScore: args.input.focusScore ?? null,
    processingSpeedScore: args.input.processingSpeedScore ?? null,
    moodScore: args.input.moodScore ?? null,
    sleepScore: args.input.sleepScore ?? null,
    sideEffects: args.input.sideEffects?.trim() || null,
    notes: args.input.notes?.trim() || null,
  });
};
