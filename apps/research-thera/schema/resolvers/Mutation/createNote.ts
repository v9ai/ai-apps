import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const noteId = await d1Tools.createNote({
    entityId: args.input.entityId,
    entityType: args.input.entityType,
    userId: userEmail,
    content: args.input.content,
    slug: args.input.slug || null,
    noteType: args.input.noteType || null,
    createdBy: userEmail,
    tags: args.input.tags || [],
  });

  // Fetch the created note to return it
  const notes = await d1Tools.listNotesForEntity(
    args.input.entityId,
    args.input.entityType,
    userEmail,
  );

  const createdNote = notes.find((note) => note.id === noteId);

  if (!createdNote) {
    throw new Error("Failed to retrieve created note");
  }

  return {
    id: createdNote.id,
    entityId: createdNote.entityId,
    entityType: createdNote.entityType,
    createdBy: createdNote.createdBy,
    noteType: createdNote.noteType || null,
    slug: createdNote.slug || null,
    content: createdNote.content,
    tags: createdNote.tags,
    visibility: (createdNote.visibility as 'PRIVATE' | 'PUBLIC') || 'PRIVATE',
    createdAt: createdNote.createdAt,
    updatedAt: createdNote.updatedAt,
  } as any; // Field resolvers will populate viewerAccess
};
