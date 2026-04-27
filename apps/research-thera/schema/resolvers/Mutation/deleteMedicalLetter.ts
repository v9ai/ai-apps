import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { deleteFromR2 } from "@ai-apps/r2";

const HEALTHCARE_BUCKET = process.env.HEALTHCARE_R2_BUCKET ?? "research-thera";

export const deleteMedicalLetter: NonNullable<MutationResolvers['deleteMedicalLetter']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const letter = await db.getMedicalLetter(args.id, userEmail);
  if (!letter) {
    return { success: true }; // already gone
  }

  // Best-effort R2 delete — ignore if object missing
  try {
    await deleteFromR2(letter.filePath, { bucket: HEALTHCARE_BUCKET });
  } catch (err) {
    console.error("[deleteMedicalLetter] R2 delete failed:", err);
  }

  await db.deleteMedicalLetterRow(args.id, userEmail);
  return { success: true };
};
