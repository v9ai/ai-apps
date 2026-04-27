import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const medicalLetters: NonNullable<QueryResolvers['medicalLetters']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.listMedicalLetters(args.doctorId, userEmail);
};
