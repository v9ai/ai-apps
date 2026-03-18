import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
// ── Custom type: pgvector ──────────────────────────────────────────

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

// ── Better Auth tables ─────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Core domain tables ─────────────────────────────────────────────

export const bloodTests = pgTable(
  "blood_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    status: text("status").notNull().default("pending"),
    testDate: date("test_date"),
    errorMessage: text("error_message"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blood_tests_user_idx").on(table.userId),
    index("blood_tests_uploaded_idx").on(table.uploadedAt),
  ],
);

export const bloodMarkers = pgTable(
  "blood_markers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => bloodTests.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
    unit: text("unit").notNull(),
    referenceRange: text("reference_range"),
    flag: text("flag").notNull().default("normal"),
  },
  (table) => [index("blood_markers_test_idx").on(table.testId)],
);

export const conditions = pgTable(
  "conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("conditions_user_idx").on(table.userId)],
);

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dosage: text("dosage"),
    frequency: text("frequency"),
    notes: text("notes"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("medications_user_idx").on(table.userId)],
);

export const symptoms = pgTable(
  "symptoms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    severity: text("severity"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("symptoms_user_idx").on(table.userId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    provider: text("provider"),
    notes: text("notes"),
    appointmentDate: date("appointment_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("appointments_user_idx").on(table.userId)],
);

// ── Embedding tables ───────────────────────────────────────────────

export const bloodTestEmbeddings = pgTable(
  "blood_test_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => bloodTests.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("blood_test_emb_user_idx").on(table.userId)],
);

export const bloodMarkerEmbeddings = pgTable(
  "blood_marker_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    markerId: uuid("marker_id")
      .notNull()
      .references(() => bloodMarkers.id, { onDelete: "cascade" })
      .unique(),
    testId: uuid("test_id").notNull(),
    userId: text("user_id").notNull(),
    markerName: text("marker_name").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blood_marker_emb_user_idx").on(table.userId),
    index("blood_marker_emb_test_idx").on(table.testId),
  ],
);

export const conditionEmbeddings = pgTable(
  "condition_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conditionId: uuid("condition_id")
      .notNull()
      .references(() => conditions.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("condition_emb_user_idx").on(table.userId)],
);

export const medicationEmbeddings = pgTable(
  "medication_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("medication_emb_user_idx").on(table.userId)],
);

export const symptomEmbeddings = pgTable(
  "symptom_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symptomId: uuid("symptom_id")
      .notNull()
      .references(() => symptoms.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("symptom_emb_user_idx").on(table.userId)],
);

export const appointmentEmbeddings = pgTable(
  "appointment_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("appointment_emb_user_idx").on(table.userId)],
);

export const healthStateEmbeddings = pgTable(
  "health_state_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => bloodTests.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    derivedMetrics: jsonb("derived_metrics").notNull().default({}),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("health_state_emb_user_idx").on(table.userId)],
);

// ── Research ───────────────────────────────────────────────────────

export const conditionResearches = pgTable(
  "condition_researches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conditionId: uuid("condition_id")
      .notNull()
      .references(() => conditions.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    papers: jsonb("papers").notNull().default([]),
    synthesis: text("synthesis"),
    paperCount: text("paper_count"),
    searchQuery: text("search_query"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("condition_researches_condition_idx").on(table.conditionId),
  ],
);
