import { z } from "zod";

export const taskStatusEnum = z.enum([
  "inbox",
  "active",
  "completed",
  "archived",
]);

export const energyLevelEnum = z.enum(["high", "medium", "low"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: taskStatusEnum.optional().default("inbox"),
  dueDate: z.coerce.date().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  energyPreference: energyLevelEnum.optional(),
  parentTaskId: z.string().uuid().optional(),
  priorityManual: z.number().int().min(1).max(5).optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
  energyPreference: energyLevelEnum.nullable().optional(),
  priorityManual: z.number().int().min(1).max(5).nullable().optional(),
  position: z.number().int().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
