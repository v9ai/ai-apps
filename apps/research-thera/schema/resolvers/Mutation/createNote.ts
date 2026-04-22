import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import {
  createNote as _createNote,
  listNotesForEntity,
  db,
} from "@/src/db";

async function assertEntityOwned(
  entityType: string,
  entityId: number,
  userEmail: string,
): Promise<void> {
  const notFound = () =>
    new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });

  switch (entityType) {
    case "Goal": {
      try {
        await db.getGoal(entityId, userEmail);
      } catch {
        throw notFound();
      }
      return;
    }
    case "Issue": {
      const issue = await db.getIssue(entityId, userEmail);
      if (!issue) throw notFound();
      return;
    }
    case "FamilyMember": {
      const fm = await db.getFamilyMember(entityId);
      if (!fm || fm.userId !== userEmail) throw notFound();
      return;
    }
    case "JournalEntry": {
      const entry = await db.getJournalEntry(entityId, userEmail);
      if (!entry) throw notFound();
      return;
    }
    case "Contact": {
      const contact = await db.getContact(entityId, userEmail);
      if (!contact) throw notFound();
      return;
    }
    case "ContactFeedback": {
      const fb = await db.getContactFeedback(entityId, userEmail);
      if (!fb) throw notFound();
      return;
    }
    case "TeacherFeedback": {
      const fb = await db.getTeacherFeedback(entityId, userEmail);
      if (!fb) throw notFound();
      return;
    }
    default:
      // Unknown entity type — refuse rather than trust caller input.
      throw notFound();
  }
}

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await assertEntityOwned(args.input.entityType, args.input.entityId, userEmail);

  const noteId = await _createNote({
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
  const notes = await listNotesForEntity(
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
