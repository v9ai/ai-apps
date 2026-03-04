import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const notes: NonNullable<QueryResolvers['notes']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const notesList = await d1Tools.listNotesForEntity(
    args.entityId,
    args.entityType,
    userEmail,
  );

  return notesList.map((note) => ({
    id: note.id,
    entityId: note.entityId,
    entityType: note.entityType,
    createdBy: note.createdBy || userEmail,
    noteType: note.noteType || null,
    slug: note.slug || null,
    content: note.content,
    tags: note.tags,
    visibility: (note.visibility as 'PRIVATE' | 'PUBLIC') || 'PRIVATE',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  })) as any; // Field resolvers will populate viewerAccess
};
