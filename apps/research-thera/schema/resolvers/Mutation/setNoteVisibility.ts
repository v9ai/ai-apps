import type { MutationResolvers } from "./../../types.generated";
import { getNoteById, setNoteVisibility as _setNoteVisibility } from "@/src/db";

export const setNoteVisibility: NonNullable<MutationResolvers['setNoteVisibility']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Check if user is the owner
  const note = await getNoteById(args.noteId, userEmail);
  if (!note) {
    throw new Error("Note not found");
  }

  if (note.createdBy !== userEmail) {
    throw new Error("Only the note owner can change visibility");
  }

  const updatedNote = await _setNoteVisibility(
    args.noteId,
    args.visibility,
    userEmail,
  );

  if (!updatedNote) {
    throw new Error("Failed to update note visibility");
  }

  return {
    id: updatedNote.id,
    entityId: updatedNote.entityId,
    entityType: updatedNote.entityType,
    createdBy: updatedNote.createdBy,
    noteType: updatedNote.noteType || null,
    slug: updatedNote.slug || null,
    title: updatedNote.title || null,
    content: updatedNote.content,
    tags: updatedNote.tags || null,
    visibility:
      (updatedNote.visibility as "PRIVATE" | "PUBLIC") || "PRIVATE",
    createdAt: updatedNote.createdAt,
    updatedAt: updatedNote.updatedAt,
  } as any; // Field resolvers will populate viewerAccess
};