import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addSupplement: NonNullable<MutationResolvers['addSupplement']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const owns = await db.assertOwnsProtocol(args.protocolId, userEmail);
  if (!owns) throw new Error("Protocol not found");

  const name = args.input.name.trim();
  if (!name) throw new Error("Supplement name is required");

  return db.createSupplement({
    protocolId: args.protocolId,
    name,
    dosage: args.input.dosage.trim(),
    frequency: args.input.frequency.trim(),
    mechanism: args.input.mechanism?.trim() || null,
    targetAreas: args.input.targetAreas ?? [],
    notes: args.input.notes?.trim() || null,
    url: args.input.url?.trim() || null,
  });
};
