import type { QueryResolvers } from "../../types.generated";
import { d1Tools } from "@/src/db";

export const allNotes: NonNullable<QueryResolvers['allNotes']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const notes = await d1Tools.getAllNotesForUser(userEmail);
  return notes as any; // Field resolvers will populate viewerAccess
};
