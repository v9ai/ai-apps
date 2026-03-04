import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const note: NonNullable<QueryResolvers['note']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  
  let foundNote;

  if (args.slug) {
    // Query by slug
    foundNote = await d1Tools.getNoteBySlug(args.slug, userEmail || '');
  } else if (args.id) {
    // Query by ID
    foundNote = await d1Tools.getNoteById(args.id, userEmail || '');
  } else {
    return null;
  }

  if (!foundNote) {
    return null;
  }

  // Check if viewer can read this note
  const access = await d1Tools.canViewerReadNote(foundNote.id, userEmail || null);
  
  if (!access.canRead) {
    return null; // Return null instead of error to avoid leaking note existence
  }

  return {
    id: foundNote.id,
    entityId: foundNote.entityId,
    entityType: foundNote.entityType,
    createdBy: foundNote.createdBy || userEmail || '',
    noteType: foundNote.noteType || null,
    slug: foundNote.slug || null,
    title: foundNote.title || null,
    content: foundNote.content,
    tags: foundNote.tags || null,
    visibility: (foundNote.visibility as 'PRIVATE' | 'PUBLIC') || 'PRIVATE',
    createdAt: foundNote.createdAt,
    updatedAt: foundNote.updatedAt,
  } as any; // Field resolvers will populate viewerAccess
};
