import { tasks } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseTags(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function mapTask(row: typeof tasks.$inferSelect) {
  return {
    ...row,
    tags: parseTags(row.tags),
    dueDate: row.due_date ?? null,
    completedAt: row.completed_at ?? null,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskResolvers = {
  Query: {
    async tasks(
      _parent: unknown,
      args: { status?: string; priority?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.status) conditions.push(eq(tasks.status, args.status as typeof tasks.status.enumValues[number]));
      if (args.priority) conditions.push(eq(tasks.priority, args.priority as typeof tasks.priority.enumValues[number]));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(tasks)
          .where(where)
          .orderBy(desc(tasks.created_at))
          .limit(limit + 1)
          .offset(offset),
        context.db.select({ value: count() }).from(tasks).where(where),
      ]);

      return {
        tasks: rows.slice(0, limit).map(mapTask),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async task(_parent: unknown, args: { id: number }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, args.id))
        .limit(1);
      return rows[0] ? mapTask(rows[0]) : null;
    },
  },

  Mutation: {
    async createTask(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { title, description, status, priority, dueDate, entityType, entityId, tags } = args.input;
      const rows = await context.db
        .insert(tasks)
        .values({
          title,
          description: description ?? null,
          status: status ?? "todo",
          priority: priority ?? "medium",
          due_date: dueDate ?? null,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          tags: tags ? JSON.stringify(tags) : "[]",
        })
        .returning();
      return mapTask(rows[0]);
    },

    async updateTask(
      _parent: unknown,
      args: { id: number; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { tags, dueDate, entityType, entityId, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (tags !== undefined) patch.tags = JSON.stringify(tags);
      if (dueDate !== undefined) patch.due_date = dueDate;
      if (entityType !== undefined) patch.entity_type = entityType;
      if (entityId !== undefined) patch.entity_id = entityId;
      patch.updated_at = new Date().toISOString();

      const rows = await context.db
        .update(tasks)
        .set(patch)
        .where(eq(tasks.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Task not found");
      return mapTask(rows[0]);
    },

    async completeTask(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const now = new Date().toISOString();
      const rows = await context.db
        .update(tasks)
        .set({ status: "done", completed_at: now, updated_at: now })
        .where(eq(tasks.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Task not found");
      return mapTask(rows[0]);
    },

    async deleteTask(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(tasks).where(eq(tasks.id, args.id));
      return { success: true, message: "Task deleted" };
    },
  },
};
