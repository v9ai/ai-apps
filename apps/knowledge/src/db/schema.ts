import {
  pgTable,
  pgEnum,
  uuid,
  text,
  serial,
  integer,
  real,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Better Auth tables ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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

// ── Enums ──────────────────────────────────────────────────────────

export const conceptTypeEnum = pgEnum("concept_type", [
  "topic",
  "skill",
  "competency",
  "technique",
  "theory",
  "tool",
]);

export const edgeTypeEnum = pgEnum("edge_type", [
  "prerequisite",
  "related",
  "part_of",
  "builds_on",
  "contrasts_with",
  "applies_to",
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
  "view",
  "read_start",
  "read_complete",
  "bookmark",
  "highlight",
  "search",
  "concept_click",
  "citation_click",
  "nav_next",
  "nav_prev",
]);

export const masteryLevelEnum = pgEnum("mastery_level", [
  "novice",
  "beginner",
  "intermediate",
  "proficient",
  "expert",
]);

// ── Core Content ───────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  icon: text("icon").notNull(),
  description: text("description").notNull(),
  gradientFrom: text("gradient_from").notNull(),
  gradientTo: text("gradient_to").notNull(),
  sortOrder: integer("sort_order").notNull(),
  lessonRangeLo: integer("lesson_range_lo").notNull(),
  lessonRangeHi: integer("lesson_range_hi").notNull(),
});

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").unique().notNull(),
    number: integer("number").unique().notNull(),
    title: text("title").notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id)
      .notNull(),
    wordCount: integer("word_count").notNull().default(0),
    readingTimeMin: integer("reading_time_min").notNull().default(1),
    content: text("content").notNull(),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lessons_category_idx").on(table.categoryId),
    index("lessons_number_idx").on(table.number),
  ],
);

export const lessonSections = pgTable(
  "lesson_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .references(() => lessons.id, { onDelete: "cascade" })
      .notNull(),
    heading: text("heading").notNull(),
    headingLevel: integer("heading_level").notNull().default(2),
    content: text("content").notNull(),
    sectionOrder: integer("section_order").notNull(),
    wordCount: integer("word_count").notNull().default(0),
  },
  (table) => [index("lesson_sections_lesson_idx").on(table.lessonId)],
);

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    authors: text("authors"),
    year: integer("year"),
    url: text("url").notNull(),
    venue: text("venue"),
    normalizedTitle: text("normalized_title").notNull(),
  },
  (table) => [
    uniqueIndex("citations_normalized_title_year_idx").on(
      table.normalizedTitle,
      table.year,
    ),
  ],
);

export const lessonCitations = pgTable(
  "lesson_citations",
  {
    lessonId: uuid("lesson_id")
      .references(() => lessons.id, { onDelete: "cascade" })
      .notNull(),
    citationId: uuid("citation_id")
      .references(() => citations.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.lessonId, table.citationId] })],
);

// ── Knowledge Graph ────────────────────────────────────────────────

export const concepts = pgTable(
  "concepts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").unique().notNull(),
    description: text("description"),
    conceptType: conceptTypeEnum("concept_type").notNull().default("topic"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("concepts_type_idx").on(table.conceptType)],
);

export const conceptEdges = pgTable(
  "concept_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    targetId: uuid("target_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    edgeType: edgeTypeEnum("edge_type").notNull(),
    weight: real("weight").notNull().default(1.0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("concept_edges_source_target_type_idx").on(
      table.sourceId,
      table.targetId,
      table.edgeType,
    ),
    index("concept_edges_source_idx").on(table.sourceId),
    index("concept_edges_target_idx").on(table.targetId),
    index("concept_edges_type_idx").on(table.edgeType),
  ],
);

export const lessonConcepts = pgTable(
  "lesson_concepts",
  {
    lessonId: uuid("lesson_id")
      .references(() => lessons.id, { onDelete: "cascade" })
      .notNull(),
    conceptId: uuid("concept_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    relevance: real("relevance").notNull().default(1.0),
  },
  (table) => [primaryKey({ columns: [table.lessonId, table.conceptId] })],
);

// ── Knowledge Tracing ──────────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const knowledgeStates = pgTable(
  "knowledge_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    conceptId: uuid("concept_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    pMastery: real("p_mastery").notNull().default(0.0),
    pTransit: real("p_transit").notNull().default(0.1),
    pSlip: real("p_slip").notNull().default(0.1),
    pGuess: real("p_guess").notNull().default(0.2),
    totalInteractions: integer("total_interactions").notNull().default(0),
    correctInteractions: integer("correct_interactions").notNull().default(0),
    masteryLevel: masteryLevelEnum("mastery_level")
      .notNull()
      .default("novice"),
    lastInteractionAt: timestamp("last_interaction_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("knowledge_states_user_concept_idx").on(
      table.userId,
      table.conceptId,
    ),
    index("knowledge_states_user_idx").on(table.userId),
    index("knowledge_states_concept_idx").on(table.conceptId),
    index("knowledge_states_mastery_idx").on(table.userId, table.masteryLevel),
  ],
);

export const interactionEvents = pgTable(
  "interaction_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    conceptId: uuid("concept_id").references(() => concepts.id, {
      onDelete: "set null",
    }),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => lessonSections.id, {
      onDelete: "set null",
    }),
    interactionType: interactionTypeEnum("interaction_type").notNull(),
    isCorrect: boolean("is_correct"),
    responseTimeMs: integer("response_time_ms"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("interaction_events_user_time_idx").on(table.userId, table.createdAt),
    index("interaction_events_user_concept_idx").on(
      table.userId,
      table.conceptId,
      table.createdAt,
    ),
    index("interaction_events_lesson_idx").on(table.lessonId),
    index("interaction_events_type_idx").on(table.interactionType),
  ],
);

// ── Embeddings ─────────────────────────────────────────────────────

export const lessonEmbeddings = pgTable("lesson_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .references(() => lessons.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  content: text("content").notNull(),
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sectionEmbeddings = pgTable(
  "section_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .references(() => lessonSections.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    lessonId: uuid("lesson_id")
      .references(() => lessons.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("section_embeddings_lesson_idx").on(table.lessonId)],
);

export const conceptEmbeddings = pgTable("concept_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptId: uuid("concept_id")
    .references(() => concepts.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  content: text("content").notNull(),
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userLessonInteractions = pgTable(
  "user_lesson_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    lessonId: uuid("lesson_id")
      .references(() => lessons.id, { onDelete: "cascade" })
      .notNull(),
    readProgress: real("read_progress").notNull().default(0),
    rating: integer("rating"),
    bookmarked: boolean("bookmarked").notNull().default(false),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_lesson_interactions_user_lesson_idx").on(
      table.userId,
      table.lessonId,
    ),
    index("user_lesson_interactions_user_idx").on(table.userId),
    index("user_lesson_interactions_lesson_idx").on(table.lessonId),
  ],
);

// ── Chat Messages ─────────────────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: text("thread_id").notNull(),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_thread_time_idx").on(table.threadId, table.createdAt),
  ],
);

// ── Analytics ──────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    sessionId: text("session_id"),
    eventName: text("event_name").notNull(),
    eventCategory: text("event_category").notNull(),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    properties: jsonb("properties").notNull().default({}),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_user_time_idx").on(table.userId, table.createdAt),
    index("analytics_events_name_time_idx").on(
      table.eventName,
      table.createdAt,
    ),
    index("analytics_events_lesson_time_idx").on(table.lessonId, table.createdAt),
    index("analytics_events_session_idx").on(table.sessionId, table.createdAt),
  ],
);

// ── Relations ──────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  category: one(categories, {
    fields: [lessons.categoryId],
    references: [categories.id],
  }),
  sections: many(lessonSections),
  lessonCitations: many(lessonCitations),
  lessonConcepts: many(lessonConcepts),
}));

export const lessonSectionsRelations = relations(lessonSections, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonSections.lessonId],
    references: [lessons.id],
  }),
}));

export const citationsRelations = relations(citations, ({ many }) => ({
  lessonCitations: many(lessonCitations),
}));

export const lessonCitationsRelations = relations(
  lessonCitations,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lessonCitations.lessonId],
      references: [lessons.id],
    }),
    citation: one(citations, {
      fields: [lessonCitations.citationId],
      references: [citations.id],
    }),
  }),
);

export const conceptsRelations = relations(concepts, ({ many }) => ({
  outgoingEdges: many(conceptEdges, { relationName: "source" }),
  incomingEdges: many(conceptEdges, { relationName: "target" }),
  lessonConcepts: many(lessonConcepts),
}));

export const conceptEdgesRelations = relations(conceptEdges, ({ one }) => ({
  source: one(concepts, {
    fields: [conceptEdges.sourceId],
    references: [concepts.id],
    relationName: "source",
  }),
  target: one(concepts, {
    fields: [conceptEdges.targetId],
    references: [concepts.id],
    relationName: "target",
  }),
}));

export const lessonConceptsRelations = relations(lessonConcepts, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonConcepts.lessonId],
    references: [lessons.id],
  }),
  concept: one(concepts, {
    fields: [lessonConcepts.conceptId],
    references: [concepts.id],
  }),
}));
