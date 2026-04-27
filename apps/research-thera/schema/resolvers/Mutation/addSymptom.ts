import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addSymptom: NonNullable<MutationResolvers['addSymptom']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const description = args.input.description.trim();
  if (!description) throw new Error("Symptom description is required");
  const severity = args.input.severity?.trim() || null;
  const loggedAt = args.input.loggedAt || null;

  const symptom = await db.createSymptom({
    userId: userEmail,
    description,
    severity,
    loggedAt,
  });

  try {
    await db.embedSymptom(symptom.id, userEmail, description, {
      severity,
      loggedAt: new Date(symptom.loggedAt).toLocaleDateString(),
    });
  } catch (err) {
    console.error("[addSymptom] embedding failed:", err);
  }

  return symptom;
};
