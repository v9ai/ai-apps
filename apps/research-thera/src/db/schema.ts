import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const familyMembers = sqliteTable("family_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  firstName: text("first_name").notNull(),
  name: text("name"),
  ageYears: integer("age_years"),
  relationship: text("relationship"),
  dateOfBirth: text("date_of_birth"),
  bio: text("bio"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  occupation: text("occupation"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const familyMemberShares = sqliteTable("family_member_shares", {
  familyMemberId: integer("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // normalized lower(trim(email))
  role: text("role").notNull().default("VIEWER"), // VIEWER or EDITOR
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull(),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  slug: text("slug").unique(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  therapeuticText: text("therapeutic_text"),
  therapeuticTextLanguage: text("therapeutic_text_language"),
  therapeuticTextGeneratedAt: text("therapeutic_text_generated_at"),
  storyLanguage: text("story_language"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const therapyResearch = sqliteTable("therapy_research", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull(),
  therapeuticGoalType: text("therapeutic_goal_type").notNull(),
  title: text("title").notNull(),
  authors: text("authors").notNull(), // JSON array
  year: integer("year"),
  journal: text("journal"),
  doi: text("doi"),
  url: text("url"),
  abstract: text("abstract"),
  keyFindings: text("key_findings").notNull(), // JSON array
  therapeuticTechniques: text("therapeutic_techniques").notNull(), // JSON array
  evidenceLevel: text("evidence_level"),
  relevanceScore: integer("relevance_score").notNull(),
  extractedBy: text("extracted_by").notNull(),
  extractionConfidence: integer("extraction_confidence").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const therapeuticQuestions = sqliteTable("therapeutic_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull(),
  question: text("question").notNull(),
  researchId: integer("research_id"),
  researchTitle: text("research_title"),
  rationale: text("rationale").notNull(),
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityId: integer("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  userId: text("user_id").notNull(),
  noteType: text("note_type"),
  slug: text("slug").unique(),
  title: text("title"),
  content: text("content").notNull(),
  createdBy: text("created_by"),
  tags: text("tags"), // JSON array
  visibility: text("visibility").notNull().default("PRIVATE"), // PRIVATE or PUBLIC
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const noteShares = sqliteTable("note_shares", {
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // normalized lower(trim(email))
  role: text("role").notNull().default("READER"), // READER or EDITOR
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull(), // who created the share
});

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  audioKey: text("audio_key"),
  audioUrl: text("audio_url"),
  audioGeneratedAt: text("audio_generated_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const goalStories = sqliteTable("goal_stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull(),
  language: text("language").notNull(),
  minutes: integer("minutes").notNull(),
  text: text("text").notNull(),
  audioKey: text("audio_key"),
  audioUrl: text("audio_url"),
  audioGeneratedAt: text("audio_generated_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const textSegments = sqliteTable("text_segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull(),
  storyId: integer("story_id"),
  idx: integer("idx").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // AUDIO, RESEARCH, QUESTIONS, LONGFORM
  goalId: integer("goal_id").notNull(),
  storyId: integer("story_id"),
  status: text("status").notNull(), // RUNNING, SUCCEEDED, FAILED
  progress: integer("progress").notNull().default(0),
  result: text("result"), // JSON object
  error: text("error"), // JSON object
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const audioAssets = sqliteTable("audio_assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  goalId: integer("goal_id").notNull(),
  storyId: integer("story_id"),
  language: text("language").notNull(),
  voice: text("voice").notNull(),
  mimeType: text("mime_type").notNull(),
  manifest: text("manifest").notNull(), // JSON object
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const notesResearch = sqliteTable("notes_research", {
  noteId: integer("note_id").notNull(),
  researchId: integer("research_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const claimCards = sqliteTable("claim_cards", {
  id: text("id").primaryKey(),
  noteId: integer("note_id"),
  claim: text("claim").notNull(),
  scope: text("scope"), // JSON: { population?, intervention?, comparator?, outcome?, timeframe?, setting? }
  verdict: text("verdict").notNull(), // unverified, supported, contradicted, mixed, insufficient
  confidence: integer("confidence").notNull(), // 0-100 (stored as integer for SQLite)
  evidence: text("evidence").notNull(), // JSON array of EvidenceItem[]
  queries: text("queries").notNull(), // JSON array of search queries used
  provenance: text("provenance").notNull(), // JSON: { generatedBy, model?, sourceTools[] }
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const notesClaims = sqliteTable("notes_claims", {
  noteId: integer("note_id").notNull(),
  claimId: text("claim_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  familyMemberId: integer("family_member_id"),
  title: text("title"),
  content: text("content").notNull(),
  mood: text("mood"),
  moodScore: integer("mood_score"),
  tags: text("tags"), // JSON array
  goalId: integer("goal_id"),
  isPrivate: integer("is_private").notNull().default(1), // 1 = true, 0 = false
  entryDate: text("entry_date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const behaviorObservations = sqliteTable("behavior_observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyMemberId: integer("family_member_id").notNull(),
  goalId: integer("goal_id"),
  characteristicId: integer("characteristic_id"),
  userId: text("user_id").notNull(),
  observedAt: text("observed_at").notNull(),
  observationType: text("observation_type").notNull(),
  frequency: integer("frequency"),
  intensity: text("intensity"),
  context: text("context"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const familyMemberCharacteristics = sqliteTable(
  "family_member_characteristics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    familyMemberId: integer("family_member_id").notNull(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(), // STRENGTH | SUPPORT_NEED | PRIORITY_CONCERN
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity"),
    frequencyPerWeek: integer("frequency_per_week"),
    durationWeeks: integer("duration_weeks"),
    ageOfOnset: integer("age_of_onset"),
    impairmentDomains: text("impairment_domains"), // JSON array
    formulationStatus: text("formulation_status").notNull().default("DRAFT"),
    externalizedName: text("externalized_name"),
    strengths: text("strengths"),
    riskTier: text("risk_tier").notNull().default("NONE"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
);

export const uniqueOutcomes = sqliteTable("unique_outcomes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characteristicId: integer("characteristic_id").notNull(),
  userId: text("user_id").notNull(),
  observedAt: text("observed_at").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  role: text("role"),
  ageYears: integer("age_years"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const relationships = sqliteTable("relationships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: integer("subject_id").notNull(),
  relatedType: text("related_type").notNull(),
  relatedId: integer("related_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  context: text("context"),
  startDate: text("start_date"),
  status: text("status").default("active"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  storyLanguage: text("story_language").notNull().default("English"),
  storyMinutes: integer("story_minutes").notNull().default(10),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Better Auth Tables
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});
