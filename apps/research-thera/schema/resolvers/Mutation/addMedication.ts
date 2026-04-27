import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addMedication: NonNullable<MutationResolvers['addMedication']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const name = args.input.name.trim();
  if (!name) throw new Error("Medication name is required");
  const familyMemberId = args.input.familyMemberId ?? null;
  const dosage = args.input.dosage?.trim() || null;
  const frequency = args.input.frequency?.trim() || null;
  const notes = args.input.notes?.trim() || null;
  const startDate = args.input.startDate || null;
  const endDate = args.input.endDate || null;

  const medication = await db.createMedication({
    userId: userEmail,
    familyMemberId,
    name,
    dosage,
    frequency,
    notes,
    startDate,
    endDate,
  });

  try {
    await db.embedMedication(medication.id, userEmail, name, {
      dosage,
      frequency,
      notes,
    });
  } catch (err) {
    console.error("[addMedication] embedding failed:", err);
  }

  return medication;
};
