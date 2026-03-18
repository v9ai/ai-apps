import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@ai-apps/auth/schema";

// ── Better Auth tables ──────────────────────────────────────────────

export { user, session, account, verification } from "@ai-apps/auth/schema";

// ── App tables ──────────────────────────────────────────────────────

export type TaskStatus = "inbox" | "active" | "completed" | "archived";
export type EnergyLevel = "high" | "medium" | "low";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("inbox").$type<TaskStatus>(),
  priorityScore: real("priority_score").default(0),
  priorityManual: integer("priority_manual"),
  dueDate: timestamp("due_date"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  energyPreference: text("energy_preference").$type<EnergyLevel>(),
  parentTaskId: uuid("parent_task_id"),
  position: integer("position").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    blockingTaskId: uuid("blocking_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockedTaskId: uuid("blocked_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockingTaskId, table.blockedTaskId] }),
  ]
);

export const userStreaks = pgTable("user_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCompletedDate: timestamp("last_completed_date"),
  freezeAvailable: integer("freeze_available").notNull().default(1),
  streakOptIn: boolean("streak_opt_in").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const timeBlocks = pgTable("time_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  bufferPercentage: integer("buffer_percentage").notNull().default(25),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  chronotype: text("chronotype").default("intermediate"),
  energyPatterns: jsonb("energy_patterns").$type<Record<string, string>>(),
  priorityWeights: jsonb("priority_weights").$type<{
    deadlineUrgency: number;
    userValue: number;
    dependencyImpact: number;
    projectWeight: number;
  }>(),
  chunkSize: integer("chunk_size").notNull().default(7),
  gamificationEnabled: boolean("gamification_enabled").notNull().default(true),
  bufferPercentage: integer("buffer_percentage").notNull().default(25),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
