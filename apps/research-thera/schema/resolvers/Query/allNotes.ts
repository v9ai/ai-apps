import type { QueryResolvers } from "../../types.generated";
import { db } from "@/src/db";

export const allNotes: NonNullable<QueryResolvers['allNotes']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const notes = await db.getAllNotesForUser(userEmail);
  return notes as any; // Field resolvers will populate viewerAccess
};
