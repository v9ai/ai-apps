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

// ── Better Auth tables ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
