import { db } from "@/src/db";
import { tasks, type TaskStatus } from "@/src/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export async function getTasksByStatus(
  userId: string,
  status: TaskStatus,
  limit = 7,
  offset = 0
) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
    .orderBy(desc(tasks.priorityScore), asc(tasks.position))
    .limit(limit)
    .offset(offset);
}

export async function getTaskCountByStatus(
  userId: string,
  status: TaskStatus
) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, status)));
  return result[0]?.count ?? 0;
}

export async function getTask(userId: string, taskId: string) {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getSubtasks(userId: string, parentTaskId: string) {
  return db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), eq(tasks.parentTaskId, parentTaskId))
    )
    .orderBy(asc(tasks.position));
}

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: Date;
    estimatedMinutes?: number;
    energyPreference?: "high" | "medium" | "low";
    parentTaskId?: string;
    priorityManual?: number;
  }
) {
  const result = await db
    .insert(tasks)
    .values({
      userId,
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string | null;
    status: TaskStatus;
    dueDate: Date | null;
    estimatedMinutes: number | null;
    actualMinutes: number | null;
    energyPreference: "high" | "medium" | "low" | null;
    priorityManual: number | null;
    priorityScore: number;
    position: number;
    completedAt: Date | null;
  }>
) {
  const result = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function deleteTask(userId: string, taskId: string) {
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
