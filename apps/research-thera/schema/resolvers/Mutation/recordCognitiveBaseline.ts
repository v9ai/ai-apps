import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const recordCognitiveBaseline: NonNullable<MutationResolvers['recordCognitiveBaseline']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const owns = await db.assertOwnsProtocol(args.protocolId, userEmail);
  if (!owns) throw new Error("Protocol not found");

  return db.upsertCognitiveBaseline({
    protocolId: args.protocolId,
    memoryScore: args.input.memoryScore ?? null,
    focusScore: args.input.focusScore ?? null,
    processingSpeedScore: args.input.processingSpeedScore ?? null,
    moodScore: args.input.moodScore ?? null,
    sleepScore: args.input.sleepScore ?? null,
  });
};
