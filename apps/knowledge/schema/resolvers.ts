import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { applicationNotes } from "../src/db/schema";

export const resolvers = {
  Query: {
    applicationNotes: async (_: unknown, { applicationId }: { applicationId: string }) => {
      const db = getDb();
      return db
        .select()
        .from(applicationNotes)
        .where(eq(applicationNotes.applicationId, applicationId));
    },
    applicationNote: async (_: unknown, { id }: { id: string }) => {
      const db = getDb();
      const [note] = await db
        .select()
        .from(applicationNotes)
        .where(eq(applicationNotes.id, id));
      return note ?? null;
    },
  },
  Mutation: {
    createApplicationNote: async (
      _: unknown,
      { input }: { input: { applicationId: string; title: string; content: string } },
    ) => {
      const db = getDb();
      const [note] = await db
        .insert(applicationNotes)
        .values(input)
        .returning();
      return note;
    },
    updateApplicationNote: async (
      _: unknown,
      { id, input }: { id: string; input: { title?: string; content?: string } },
    ) => {
      const db = getDb();
      const [note] = await db
        .update(applicationNotes)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(applicationNotes.id, id))
        .returning();
      return note;
    },
    deleteApplicationNote: async (_: unknown, { id }: { id: string }) => {
      const db = getDb();
      const result = await db
        .delete(applicationNotes)
        .where(eq(applicationNotes.id, id))
        .returning();
      return result.length > 0;
    },
  },
};
