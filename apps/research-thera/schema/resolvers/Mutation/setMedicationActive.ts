import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const setMedicationActive: NonNullable<MutationResolvers['setMedicationActive']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const med = await db.setMedicationActive(args.id, userEmail, args.isActive);
  if (!med) throw new Error("Medication not found");
  return med;
};
