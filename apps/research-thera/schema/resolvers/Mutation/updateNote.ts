import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Update the note
  await d1Tools.updateNote(args.id, userEmail, {
    noteType: args.input.noteType ?? undefined,
    content: args.input.content ?? undefined,
    createdBy: args.input.createdBy ?? undefined,
    tags: args.input.tags ?? undefined,
  });

  // Update linked research if provided
  if (args.input.linkedResearchIds) {
    await d1Tools.linkResearchToNote(args.id, args.input.linkedResearchIds);
  }

  // Fetch the updated note
  const note = await d1Tools.getNoteById(args.id, userEmail);

  if (!note) {
    throw new Error(`Note ${args.id} not found`);
  }

  return {
    id: note.id,
    entityId: note.entityId,
    entityType: note.entityType,
    createdBy: note.createdBy,
    noteType: note.noteType,
    slug: note.slug,
    content: note.content,
    tags: note.tags,
    visibility: (note.visibility as 'PRIVATE' | 'PUBLIC') || 'PRIVATE',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  } as any; // Field resolvers will populate viewerAccess
};
