import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addAllergy: NonNullable<MutationResolvers['addAllergy']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const name = args.input.name.trim();
  if (!name) throw new Error("Allergy name is required");
  const kind = args.input.kind;
  const familyMemberId = args.input.familyMemberId ?? null;
  const severity = args.input.severity?.trim() || null;
  const notes = args.input.notes?.trim() || null;

  const allergy = await db.createAllergy({
    userId: userEmail,
    familyMemberId,
    kind,
    name,
    severity,
    notes,
  });

  // Embedding is non-blocking — log and continue if it fails
  try {
    await db.embedAllergy(allergy.id, userEmail, kind, name, { severity, notes });
  } catch (err) {
    console.error("[addAllergy] embedding failed:", err);
  }

  return allergy;
};
