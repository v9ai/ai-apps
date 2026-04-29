import { sql as neonSql } from "./neon";

export type TaskStatus = "inbox" | "active" | "completed" | "archived";
export type EnergyLevel = "high" | "medium" | "low";

export type TaskRow = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priorityScore: number;
  priorityManual: number | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  energyPreference: EnergyLevel | null;
  parentTaskId: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function rowToTask(row: Record<string, unknown>): TaskRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as TaskStatus,
    priorityScore: Number(row.priority_score ?? 0),
    priorityManual: (row.priority_manual as number | null) ?? null,
    dueDate: toIso(row.due_date),
    estimatedMinutes: (row.estimated_minutes as number | null) ?? null,
    actualMinutes: (row.actual_minutes as number | null) ?? null,
    energyPreference: (row.energy_preference as EnergyLevel | null) ?? null,
    parentTaskId: (row.parent_task_id as string | null) ?? null,
    position: Number(row.position ?? 0),
    completedAt: toIso(row.completed_at),
    createdAt: toIso(row.created_at) ?? "",
    updatedAt: toIso(row.updated_at) ?? "",
  };
}

export async function listTasks(
  userEmail: string,
  status: TaskStatus,
  limit = 7,
  offset = 0,
): Promise<TaskRow[]> {
  const rows = await neonSql`
    SELECT * FROM tasks
    WHERE user_id = ${userEmail}
      AND status = ${status}
      AND parent_task_id IS NULL
    ORDER BY position ASC, priority_score DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map(rowToTask);
}

export async function getTask(taskId: string, userEmail: string): Promise<TaskRow | null> {
  const rows = await neonSql`
    SELECT * FROM tasks WHERE id = ${taskId} AND user_id = ${userEmail}
  `;
  return rows.length === 0 ? null : rowToTask(rows[0]);
}

export async function getSubtasks(
  parentTaskId: string,
  userEmail: string,
): Promise<TaskRow[]> {
  const rows = await neonSql`
    SELECT * FROM tasks
    WHERE user_id = ${userEmail} AND parent_task_id = ${parentTaskId}
    ORDER BY position ASC
  `;
  return rows.map(rowToTask);
}

export type TaskCounts = { inbox: number; active: number; completed: number; archived: number };

export async function getTaskCounts(userEmail: string): Promise<TaskCounts> {
  const rows = await neonSql`
    SELECT status, COUNT(*)::int AS count
    FROM tasks
    WHERE user_id = ${userEmail} AND parent_task_id IS NULL
    GROUP BY status
  `;
  const counts: TaskCounts = { inbox: 0, active: 0, completed: 0, archived: 0 };
  for (const row of rows) {
    const status = row.status as TaskStatus;
    if (status in counts) counts[status] = Number(row.count);
  }
  return counts;
}

export type CreateTaskInput = {
  userId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priorityManual?: number | null;
  dueDate?: string | Date | null;
  estimatedMinutes?: number | null;
  energyPreference?: EnergyLevel | null;
  parentTaskId?: string | null;
};

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const dueDate =
    input.dueDate instanceof Date ? input.dueDate.toISOString() : input.dueDate ?? null;
  const rows = await neonSql`
    INSERT INTO tasks (
      user_id, title, description, status,
      priority_manual, due_date, estimated_minutes, energy_preference, parent_task_id
    ) VALUES (
      ${input.userId},
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "inbox"},
      ${input.priorityManual ?? null},
      ${dueDate},
      ${input.estimatedMinutes ?? null},
      ${input.energyPreference ?? null},
      ${input.parentTaskId ?? null}
    )
    RETURNING *
  `;
  return rowToTask(rows[0]);
}

export type UpdateTaskInput = Partial<{
  title: string;
  description: string | null;
  status: TaskStatus;
  priorityManual: number | null;
  priorityScore: number;
  dueDate: string | Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  energyPreference: EnergyLevel | null;
  position: number;
  completedAt: string | Date | null;
}>;

export async function updateTask(
  taskId: string,
  userEmail: string,
  input: UpdateTaskInput,
): Promise<TaskRow | null> {
  const dueDate =
    input.dueDate instanceof Date
      ? input.dueDate.toISOString()
      : input.dueDate === undefined
        ? undefined
        : input.dueDate;
  const completedAt =
    input.completedAt instanceof Date
      ? input.completedAt.toISOString()
      : input.completedAt === undefined
        ? undefined
        : input.completedAt;

  // If status flipped to "completed" and caller didn't pass completedAt, stamp now.
  let stampCompletedAt: string | null | undefined = completedAt;
  if (input.status === "completed" && stampCompletedAt === undefined) {
    stampCompletedAt = new Date().toISOString();
  }
  // If status flipped away from completed, clear completedAt.
  if (input.status && input.status !== "completed" && stampCompletedAt === undefined) {
    stampCompletedAt = null;
  }

  const rows = await neonSql`
    UPDATE tasks SET
      title = COALESCE(${input.title ?? null}, title),
      description = CASE WHEN ${input.description !== undefined}::boolean THEN ${input.description ?? null} ELSE description END,
      status = COALESCE(${input.status ?? null}, status),
      priority_manual = CASE WHEN ${input.priorityManual !== undefined}::boolean THEN ${input.priorityManual ?? null} ELSE priority_manual END,
      priority_score = COALESCE(${input.priorityScore ?? null}, priority_score),
      due_date = CASE WHEN ${dueDate !== undefined}::boolean THEN ${dueDate ?? null} ELSE due_date END,
      estimated_minutes = CASE WHEN ${input.estimatedMinutes !== undefined}::boolean THEN ${input.estimatedMinutes ?? null} ELSE estimated_minutes END,
      actual_minutes = CASE WHEN ${input.actualMinutes !== undefined}::boolean THEN ${input.actualMinutes ?? null} ELSE actual_minutes END,
      energy_preference = CASE WHEN ${input.energyPreference !== undefined}::boolean THEN ${input.energyPreference ?? null} ELSE energy_preference END,
      position = COALESCE(${input.position ?? null}, position),
      completed_at = CASE WHEN ${stampCompletedAt !== undefined}::boolean THEN ${stampCompletedAt ?? null} ELSE completed_at END,
      updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userEmail}
    RETURNING *
  `;
  return rows.length === 0 ? null : rowToTask(rows[0]);
}

export async function deleteTask(taskId: string, userEmail: string): Promise<void> {
  await neonSql`DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${userEmail}`;
}

export async function reorderTasks(
  userEmail: string,
  updates: Array<{ id: string; position: number }>,
): Promise<void> {
  for (const u of updates) {
    await neonSql`
      UPDATE tasks SET position = ${u.position}, updated_at = NOW()
      WHERE id = ${u.id} AND user_id = ${userEmail}
    `;
  }
}

// ── Dependencies ────────────────────────────────────────────────────

export type TaskRef = { id: string; title: string; status: TaskStatus };

export async function getBlockers(taskId: string, userEmail: string): Promise<TaskRef[]> {
  const rows = await neonSql`
    SELECT t.id, t.title, t.status
    FROM task_dependencies d
    INNER JOIN tasks t ON t.id = d.blocking_task_id
    WHERE d.blocked_task_id = ${taskId} AND t.user_id = ${userEmail}
  `;
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as TaskStatus,
  }));
}

export async function getBlocked(taskId: string, userEmail: string): Promise<TaskRef[]> {
  const rows = await neonSql`
    SELECT t.id, t.title, t.status
    FROM task_dependencies d
    INNER JOIN tasks t ON t.id = d.blocked_task_id
    WHERE d.blocking_task_id = ${taskId} AND t.user_id = ${userEmail}
  `;
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as TaskStatus,
  }));
}

async function wouldCreateCycle(blockingTaskId: string, blockedTaskId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue: string[] = [blockedTaskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === blockingTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const rows = await neonSql`
      SELECT blocked_task_id FROM task_dependencies WHERE blocking_task_id = ${current}
    `;
    for (const r of rows) queue.push(r.blocked_task_id as string);
  }
  return false;
}

async function userOwnsTask(taskId: string, userEmail: string): Promise<boolean> {
  const rows = await neonSql`
    SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userEmail} LIMIT 1
  `;
  return rows.length > 0;
}

export async function addTaskDependency(
  blockingTaskId: string,
  blockedTaskId: string,
  userEmail: string,
): Promise<void> {
  if (blockingTaskId === blockedTaskId) {
    throw new Error("A task cannot depend on itself");
  }
  const [ownsA, ownsB] = await Promise.all([
    userOwnsTask(blockingTaskId, userEmail),
    userOwnsTask(blockedTaskId, userEmail),
  ]);
  if (!ownsA || !ownsB) throw new Error("Task not found");
  if (await wouldCreateCycle(blockingTaskId, blockedTaskId)) {
    throw new Error("Adding this dependency would create a circular reference");
  }
  await neonSql`
    INSERT INTO task_dependencies (blocking_task_id, blocked_task_id)
    VALUES (${blockingTaskId}, ${blockedTaskId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removeTaskDependency(
  blockingTaskId: string,
  blockedTaskId: string,
  userEmail: string,
): Promise<void> {
  // ownership filter via subselect — only delete if both tasks belong to userEmail
  await neonSql`
    DELETE FROM task_dependencies
    WHERE blocking_task_id = ${blockingTaskId}
      AND blocked_task_id = ${blockedTaskId}
      AND EXISTS (SELECT 1 FROM tasks WHERE id = ${blockingTaskId} AND user_id = ${userEmail})
      AND EXISTS (SELECT 1 FROM tasks WHERE id = ${blockedTaskId} AND user_id = ${userEmail})
  `;
}

// ── User preferences ────────────────────────────────────────────────

export type PriorityWeightsRow = {
  deadlineUrgency: number;
  userValue: number;
  dependencyImpact: number;
  projectWeight: number;
};

export type UserPreferencesRow = {
  chronotype: string;
  chunkSize: number;
  gamificationEnabled: boolean;
  bufferPercentage: number;
  priorityWeights: PriorityWeightsRow;
};

const DEFAULT_PRIORITY_WEIGHTS = {
  deadlineUrgency: 0.4,
  userValue: 0.3,
  dependencyImpact: 0.2,
  projectWeight: 0.1,
};

export async function getUserPreferences(userEmail: string): Promise<UserPreferencesRow> {
  const rows = await neonSql`
    SELECT chronotype, chunk_size, gamification_enabled, buffer_percentage, priority_weights
    FROM user_preferences WHERE user_id = ${userEmail} LIMIT 1
  `;
  if (rows.length === 0) {
    return {
      chronotype: "intermediate",
      chunkSize: 7,
      gamificationEnabled: true,
      bufferPercentage: 25,
      priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    };
  }
  const row = rows[0];
  return {
    chronotype: (row.chronotype as string) ?? "intermediate",
    chunkSize: Number(row.chunk_size ?? 7),
    gamificationEnabled: row.gamification_enabled !== false,
    bufferPercentage: Number(row.buffer_percentage ?? 25),
    priorityWeights:
      (row.priority_weights as UserPreferencesRow["priorityWeights"]) ?? DEFAULT_PRIORITY_WEIGHTS,
  };
}

export async function upsertUserPreferences(
  userEmail: string,
  input: Partial<UserPreferencesRow>,
): Promise<UserPreferencesRow> {
  const weightsJson = input.priorityWeights ? JSON.stringify(input.priorityWeights) : null;
  await neonSql`
    INSERT INTO user_preferences (
      user_id, chronotype, chunk_size, gamification_enabled, buffer_percentage, priority_weights
    ) VALUES (
      ${userEmail},
      ${input.chronotype ?? "intermediate"},
      ${input.chunkSize ?? 7},
      ${input.gamificationEnabled ?? true},
      ${input.bufferPercentage ?? 25},
      ${weightsJson}::jsonb
    )
    ON CONFLICT (user_id) DO UPDATE SET
      chronotype = COALESCE(EXCLUDED.chronotype, user_preferences.chronotype),
      chunk_size = COALESCE(EXCLUDED.chunk_size, user_preferences.chunk_size),
      gamification_enabled = COALESCE(EXCLUDED.gamification_enabled, user_preferences.gamification_enabled),
      buffer_percentage = COALESCE(EXCLUDED.buffer_percentage, user_preferences.buffer_percentage),
      priority_weights = COALESCE(EXCLUDED.priority_weights, user_preferences.priority_weights),
      updated_at = NOW()
  `;
  return getUserPreferences(userEmail);
}

// ── Streaks ─────────────────────────────────────────────────────────

export type UserStreakRow = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  freezeAvailable: number;
  streakOptIn: boolean;
};

export async function getUserStreak(userEmail: string): Promise<UserStreakRow> {
  const rows = await neonSql`
    SELECT current_streak, longest_streak, last_completed_date, freeze_available, streak_opt_in
    FROM user_streaks WHERE user_id = ${userEmail} LIMIT 1
  `;
  if (rows.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      freezeAvailable: 1,
      streakOptIn: true,
    };
  }
  const row = rows[0];
  return {
    currentStreak: Number(row.current_streak ?? 0),
    longestStreak: Number(row.longest_streak ?? 0),
    lastCompletedDate: (row.last_completed_date as string | null) ?? null,
    freezeAvailable: Number(row.freeze_available ?? 0),
    streakOptIn: row.streak_opt_in !== false,
  };
}

export async function persistStreak(
  userEmail: string,
  next: UserStreakRow,
): Promise<UserStreakRow> {
  await neonSql`
    INSERT INTO user_streaks (
      user_id, current_streak, longest_streak, last_completed_date, freeze_available, streak_opt_in
    ) VALUES (
      ${userEmail},
      ${next.currentStreak},
      ${next.longestStreak},
      ${next.lastCompletedDate},
      ${next.freezeAvailable},
      ${next.streakOptIn}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_completed_date = EXCLUDED.last_completed_date,
      freeze_available = EXCLUDED.freeze_available,
      streak_opt_in = EXCLUDED.streak_opt_in,
      updated_at = NOW()
  `;
  return next;
}
