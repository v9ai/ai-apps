import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const unshareNote: NonNullable<MutationResolvers['unshareNote']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Check if user is the owner
  const note = await d1Tools.getNoteById(args.noteId, userEmail);
  if (!note) {
    throw new Error("Note not found");
  }

  if (note.createdBy !== userEmail) {
    throw new Error("Only the note owner can unshare it");
  }

  const success = await d1Tools.unshareNote(
    args.noteId,
    args.email,
    userEmail,
  );

  return success;
};
