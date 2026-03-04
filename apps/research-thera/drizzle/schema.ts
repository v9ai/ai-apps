import {
  sqliteTable,
  AnySQLiteColumn,
  index,
  text,
  integer,
  uniqueIndex,
  foreignKey,
  blob,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const audioAssets = sqliteTable(
  "audio_assets",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    goalId: integer("goal_id").notNull(),
    storyId: integer("story_id"),
    language: text().notNull(),
    voice: text().notNull(),
    mimeType: text("mime_type").notNull(),
    manifest: text().notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_audio_assets_goal").on(table.goalId)],
);

export const generationJobs = sqliteTable(
  "generation_jobs",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    type: text().notNull(),
    goalId: integer("goal_id").notNull(),
    storyId: integer("story_id"),
    status: text().notNull(),
    progress: integer().default(0).notNull(),
    result: text(),
    error: text(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [
    index("idx_jobs_status").on(table.status),
    index("idx_jobs_goal").on(table.goalId),
  ],
);

export const goalStories = sqliteTable(
  "goal_stories",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    goalId: integer("goal_id").notNull(),
    language: text().notNull(),
    minutes: integer().notNull(),
    text: text().notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_stories_goal").on(table.goalId)],
);

export const familyMembers = sqliteTable(
  "family_members",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    userId: text("user_id").notNull(),
    firstName: text("first_name").notNull(),
    name: text(),
    ageYears: integer("age_years"),
    relationship: text(),
    dateOfBirth: text("date_of_birth"),
    bio: text(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_family_members_user").on(table.userId)],
);

export const goals = sqliteTable(
  "goals",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    familyMemberId: integer("family_member_id").notNull(),
    userId: text("user_id").notNull(),
    title: text().notNull(),
    description: text(),
    targetDate: text("target_date"),
    status: text().default("active").notNull(),
    priority: text().default("medium").notNull(),
    therapeuticText: text("therapeutic_text"),
    therapeuticTextLanguage: text("therapeutic_text_language"),
    therapeuticTextGeneratedAt: text("therapeutic_text_generated_at"),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    slug: text(),
  },
  (table) => [uniqueIndex("goals_slug_unique").on(table.slug)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    entityId: integer("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    userId: text("user_id").notNull(),
    noteType: text("note_type"),
    content: text().notNull(),
    createdBy: text("created_by"),
    tags: text(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    slug: text(),
    title: text(),
  },
  (table) => [
    index("idx_notes_entity").on(table.entityId, table.entityType),
    uniqueIndex("notes_slug_unique").on(table.slug),
  ],
);

export const textSegments = sqliteTable(
  "text_segments",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    goalId: integer("goal_id").notNull(),
    storyId: integer("story_id"),
    idx: integer().notNull(),
    text: text().notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_segments_story").on(table.storyId, table.idx)],
);

export const therapeuticQuestions = sqliteTable(
  "therapeutic_questions",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    goalId: integer("goal_id").notNull(),
    question: text().notNull(),
    researchId: integer("research_id"),
    researchTitle: text("research_title"),
    rationale: text().notNull(),
    generatedAt: text("generated_at").notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_questions_goal").on(table.goalId)],
);

export const therapyResearch = sqliteTable(
  "therapy_research",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    goalId: integer("goal_id").notNull(),
    therapeuticGoalType: text("therapeutic_goal_type").notNull(),
    title: text().notNull(),
    authors: text().notNull(),
    year: integer(),
    journal: text(),
    doi: text(),
    url: text(),
    abstract: text(),
    keyFindings: text("key_findings").notNull(),
    therapeuticTechniques: text("therapeutic_techniques").notNull(),
    evidenceLevel: text("evidence_level"),
    relevanceScore: integer("relevance_score").notNull(),
    extractedBy: text("extracted_by").notNull(),
    extractionConfidence: integer("extraction_confidence").notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [
    index("idx_research_doi").on(table.doi),
    index("idx_research_goal").on(table.goalId),
  ],
);

export const claimCards = sqliteTable(
  "claim_cards",
  {
    id: text().primaryKey().notNull(),
    noteId: integer("note_id"),
    claim: text().notNull(),
    scope: text(),
    verdict: text().notNull(),
    confidence: integer().notNull(),
    evidence: text().notNull(),
    queries: text().notNull(),
    provenance: text().notNull(),
    notes: text(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
    updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [index("idx_claim_cards_note").on(table.noteId)],
);

export const notesClaims = sqliteTable(
  "notes_claims",
  {
    noteId: integer("note_id").notNull(),
    claimId: text("claim_id").notNull(),
    createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
  },
  (table) => [
    index("idx_notes_claims_claim").on(table.claimId),
    index("idx_notes_claims_note").on(table.noteId),
  ],
);

export const notesResearch = sqliteTable("notes_research", {
  noteId: integer("note_id").notNull(),
  researchId: integer("research_id").notNull(),
  createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const account = sqliteTable("account", {
  id: text().primaryKey().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: integer(),
  refreshTokenExpiresAt: integer(),
  scope: text(),
  password: text(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});

export const session = sqliteTable("session", {
  id: text().primaryKey().notNull(),
  expiresAt: integer().notNull(),
  token: text().notNull(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const user = sqliteTable("user", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: integer().notNull(),
  image: text(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});

export const verification = sqliteTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer().notNull(),
  createdAt: integer(),
  updatedAt: integer(),
});

export const audioSegments = sqliteTable(
  "audio_segments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    assetId: text("asset_id")
      .notNull()
      .references(() => audioAssets.id, { onDelete: "cascade" }),
    idx: integer().notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: blob().notNull(),
    sha256: text(),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull(),
  },
  (table) => [index("idx_audio_segments_asset").on(table.assetId, table.idx)],
);

export const stories = sqliteTable("stories", {
  id: integer().primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  content: text().notNull(),
  createdAt: text("created_at").default("sql`(datetime('now'))`").notNull(),
  updatedAt: text("updated_at").default("sql`(datetime('now'))`").notNull(),
  audioKey: text("audio_key"),
  audioUrl: text("audio_url"),
  audioGeneratedAt: text("audio_generated_at"),
});
