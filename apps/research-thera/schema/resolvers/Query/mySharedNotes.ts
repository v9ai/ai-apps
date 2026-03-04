import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const mySharedNotes: NonNullable<QueryResolvers['mySharedNotes']> = async (_parent, _args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const notes = await d1Tools.getSharedNotes(userEmail);

  return notes.map((note) => ({
    id: note.id,
    entityId: note.entityId,
    entityType: note.entityType,
    createdBy: note.createdBy,
    noteType: note.noteType || null,
    slug: note.slug || null,
    title: note.title || null,
    content: note.content,
    tags: note.tags || null,
    visibility: (note.visibility as "PRIVATE" | "PUBLIC") || "PRIVATE",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  })) as any; // Field resolvers will populate viewerAccess
};