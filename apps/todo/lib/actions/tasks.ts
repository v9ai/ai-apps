"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators";
import * as taskQueries from "@/lib/queries/tasks";

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function createTaskAction(formData: FormData) {
  const session = await getSessionOrThrow();

  const parsed = createTaskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes")
      ? Number(formData.get("estimatedMinutes"))
      : undefined,
    energyPreference: formData.get("energyPreference") || undefined,
    parentTaskId: formData.get("parentTaskId") || undefined,
    priorityManual: formData.get("priorityManual")
      ? Number(formData.get("priorityManual"))
      : undefined,
  });

  const task = await taskQueries.createTask(session.user.id, parsed);
  revalidatePath("/app");
  return task;
}

export async function createTaskQuickAction(title: string, description?: string) {
  const session = await getSessionOrThrow();

  const parsed = createTaskSchema.parse({ title, description });
  const task = await taskQueries.createTask(session.user.id, parsed);
  revalidatePath("/app");
  return task;
}

export async function updateTaskAction(data: {
  id: string;
  title?: string;
  description?: string | null;
  status?: "inbox" | "active" | "completed" | "archived";
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  energyPreference?: "high" | "medium" | "low" | null;
  priorityManual?: number | null;
  position?: number;
}) {
  const session = await getSessionOrThrow();

  const parsed = updateTaskSchema.parse(data);
  const { id, ...updateData } = parsed;

  // If completing, set completedAt
  if (updateData.status === "completed") {
    (updateData as Record<string, unknown>).completedAt = new Date();
  }

  const task = await taskQueries.updateTask(session.user.id, id, updateData);
  revalidatePath("/app");
  return task;
}

export async function deleteTaskAction(taskId: string) {
  const session = await getSessionOrThrow();
  await taskQueries.deleteTask(session.user.id, taskId);
  revalidatePath("/app");
}

export async function loadMoreTasks(
  status: "inbox" | "active" | "completed" | "archived",
  offset: number,
  limit = 7
) {
  const session = await getSessionOrThrow();
  return taskQueries.getTasksByStatus(session.user.id, status, limit, offset);
}
