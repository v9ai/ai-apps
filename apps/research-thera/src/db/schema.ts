import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uuid,
  date,
  jsonb,
  real,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── pgvector (1024-dim, healthcare embeddings) ────────────────────
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").unique(),
  firstName: text("first_name").notNull(),
  name: text("name"),
  ageYears: integer("age_years"),
  relationship: text("relationship"),
  dateOfBirth: text("date_of_birth"),
  preferredLanguage: text("preferred_language"),
  bio: text("bio"),
  allergies: text("allergies"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  occupation: text("occupation"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const tagLanguageRules = pgTable(
  "tag_language_rules",
  {
    tag: text("tag").notNull(),
    userId: text("user_id").notNull(),
    language: text("language").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`NOW()`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`NOW()`),
  },
  (t) => ({
    pk: sql`PRIMARY KEY (${t.tag}, ${t.userId})`,
  }),
);

export const familyMemberShares = pgTable("family_member_shares", {
  familyMemberId: integer("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // normalized lower(trim(email))
  role: text("role").notNull().default("EDITOR"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  createdBy: text("created_by").notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id"),
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
  parentAdvice: text("parent_advice"),
  parentAdviceLanguage: text("parent_advice_language"),
  parentAdviceGeneratedAt: text("parent_advice_generated_at"),
  tags: text("tags"), // JSON array
  parentGoalId: integer("parent_goal_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const therapyResearch = pgTable("therapy_research", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  feedbackId: integer("feedback_id"),
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
  issueId: integer("issue_id"),
  journalEntryId: integer("journal_entry_id"),
  medicationId: uuid("medication_id"),
  relevanceScore: integer("relevance_score").notNull(),
  extractedBy: text("extracted_by").notNull(),
  extractionConfidence: integer("extraction_confidence").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const therapeuticQuestions = pgTable("therapeutic_questions", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  issueId: integer("issue_id"),
  journalEntryId: integer("journal_entry_id"),
  question: text("question").notNull(),
  researchId: integer("research_id"),
  researchTitle: text("research_title"),
  rationale: text("rationale").notNull(),
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const recommendedBooks = pgTable("recommended_books", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  journalEntryId: integer("journal_entry_id"),
  title: text("title").notNull(),
  authors: text("authors").notNull(), // JSON array
  year: integer("year"),
  isbn: text("isbn"),
  description: text("description").notNull(),
  whyRecommended: text("why_recommended").notNull(),
  category: text("category").notNull(),
  amazonUrl: text("amazon_url"),
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
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
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const noteShares = pgTable("note_shares", {
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // normalized lower(trim(email))
  role: text("role").notNull().default("READER"), // READER or EDITOR
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  createdBy: text("created_by").notNull(), // who created the share
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  issueId: integer("issue_id"),
  feedbackId: integer("feedback_id"),
  userId: text("user_id"),
  content: text("content").notNull(),
  language: text("language"),
  minutes: integer("minutes"),
  audioKey: text("audio_key"),
  audioUrl: text("audio_url"),
  audioGeneratedAt: text("audio_generated_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const textSegments = pgTable("text_segments", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  storyId: integer("story_id"),
  idx: integer("idx").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const generationJobs = pgTable("generation_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // AUDIO, RESEARCH, QUESTIONS, LONGFORM
  goalId: integer("goal_id"),
  storyId: integer("story_id"),
  status: text("status").notNull(), // RUNNING, SUCCEEDED, FAILED
  progress: integer("progress").notNull().default(0),
  result: text("result"), // JSON object
  error: text("error"), // JSON object
  langgraphThreadId: text("langgraph_thread_id"),
  langgraphRunId: text("langgraph_run_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const audioAssets = pgTable("audio_assets", {
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
    .default(sql`NOW()`),
});

export const notesResearch = pgTable("notes_research", {
  noteId: integer("note_id").notNull(),
  researchId: integer("research_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const claimCards = pgTable("claim_cards", {
  id: text("id").primaryKey(),
  noteId: integer("note_id"),
  claim: text("claim").notNull(),
  scope: text("scope"), // JSON: { population?, intervention?, comparator?, outcome?, timeframe?, setting? }
  verdict: text("verdict").notNull(), // unverified, supported, contradicted, mixed, insufficient
  confidence: integer("confidence").notNull(), // 0-100
  evidence: text("evidence").notNull(), // JSON array of EvidenceItem[]
  queries: text("queries").notNull(), // JSON array of search queries used
  provenance: text("provenance").notNull(), // JSON: { generatedBy, model?, sourceTools[] }
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const notesClaims = pgTable("notes_claims", {
  noteId: integer("note_id").notNull(),
  claimId: text("claim_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  familyMemberId: integer("family_member_id"),
  title: text("title"),
  content: text("content").notNull(),
  mood: text("mood"),
  moodScore: integer("mood_score"),
  tags: text("tags"), // JSON array
  goalId: integer("goal_id"),
  isPrivate: integer("is_private").notNull().default(1), // 1 = true, 0 = false
  isVault: integer("is_vault").notNull().default(0), // 1 = hidden behind PIN, 0 = normal
  entryDate: text("entry_date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const behaviorObservations = pgTable("behavior_observations", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  goalId: integer("goal_id"),
  issueId: integer("issue_id"),
  userId: text("user_id").notNull(),
  observedAt: text("observed_at").notNull(),
  observationType: text("observation_type").notNull(),
  frequency: integer("frequency"),
  intensity: text("intensity"),
  context: text("context"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const teacherFeedbacks = pgTable("teacher_feedbacks", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  teacherName: text("teacher_name").notNull(),
  subject: text("subject"),
  feedbackDate: text("feedback_date").notNull(),
  content: text("content").notNull(),
  tags: text("tags"), // JSON array
  source: text("source"), // e.g. "email", "meeting", "report", "phone"
  extracted: integer("extracted").notNull().default(0), // 0 = not extracted, 1 = extracted into issues
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const contactFeedbacks = pgTable("contact_feedbacks", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  subject: text("subject"),
  feedbackDate: text("feedback_date").notNull(),
  content: text("content").notNull(),
  tags: text("tags"), // JSON array
  source: text("source"), // e.g. "email", "meeting", "report", "phone"
  extracted: integer("extracted").notNull().default(0),
  extractedIssues: text("extracted_issues"), // JSON array of extracted issues (legacy, kept for backwards compatibility)
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id"),
  journalEntryId: integer("journal_entry_id"),
  familyMemberId: integer("family_member_id").notNull(),
  relatedFamilyMemberId: integer("related_family_member_id"),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // academic, behavioral, social, emotional, developmental, health, communication, other
  severity: text("severity").notNull(), // low, medium, high
  recommendations: text("recommendations"), // JSON array of strings
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const issueLinks = pgTable("issue_links", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  linkedIssueId: integer("linked_issue_id").notNull(),
  linkType: text("link_type").notNull().default("related"), // related, causes, caused_by, duplicate
  userId: text("user_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const issueContacts = pgTable("issue_contacts", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  contactId: integer("contact_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const issueScreenshots = pgTable("issue_screenshots", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  userId: text("user_id").notNull(),
  r2Key: text("r2_key").notNull(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  caption: text("caption"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

export const deepIssueAnalyses = pgTable("deep_issue_analyses", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  triggerIssueId: integer("trigger_issue_id"),
  userId: text("user_id").notNull(),
  jobId: text("job_id"),
  summary: text("summary").notNull(),
  patternClusters: text("pattern_clusters").notNull(), // JSON
  timelineAnalysis: text("timeline_analysis").notNull(), // JSON
  familySystemInsights: text("family_system_insights").notNull(), // JSON
  priorityRecommendations: text("priority_recommendations").notNull(), // JSON
  researchRelevance: text("research_relevance").notNull(), // JSON
  parentAdvice: text("parent_advice").notNull().default("[]"), // JSON
  dataSnapshot: text("data_snapshot").notNull(), // JSON
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const deepGoalAnalyses = pgTable("deep_goal_analyses", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  userId: text("user_id").notNull(),
  jobId: text("job_id"),
  summary: text("summary").notNull(),
  patternClusters: text("pattern_clusters").notNull(), // JSON
  timelineAnalysis: text("timeline_analysis").notNull(), // JSON
  familySystemInsights: text("family_system_insights").notNull(), // JSON
  priorityRecommendations: text("priority_recommendations").notNull(), // JSON
  researchRelevance: text("research_relevance").notNull(), // JSON
  parentAdvice: text("parent_advice").notNull().default("[]"), // JSON
  dataSnapshot: text("data_snapshot").notNull(), // JSON
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

// Polymorphic deep analyses. subject_type: 'GOAL' | 'NOTE' | 'JOURNAL_ENTRY' | 'FAMILY_MEMBER'.
// trigger_type: 'ISSUE' | 'OBSERVATION' | 'FEEDBACK' | null.
export const deepAnalyses = pgTable("deep_analyses", {
  id: serial("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: integer("subject_id").notNull(),
  triggerType: text("trigger_type"),
  triggerId: integer("trigger_id"),
  userId: text("user_id").notNull(),
  jobId: text("job_id"),
  summary: text("summary").notNull(),
  patternClusters: text("pattern_clusters").notNull(),
  timelineAnalysis: text("timeline_analysis").notNull(),
  familySystemInsights: text("family_system_insights").notNull(),
  priorityRecommendations: text("priority_recommendations").notNull(),
  researchRelevance: text("research_relevance").notNull(),
  parentAdvice: text("parent_advice").notNull().default("[]"),
  dataSnapshot: text("data_snapshot").notNull(),
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  description: text("description"),
  role: text("role"),
  ageYears: integer("age_years"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
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
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  storyLanguage: text("story_language").notNull().default("English"),
  storyMinutes: integer("story_minutes").notNull().default(10),
  dateOfBirth: text("date_of_birth"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  goalId: integer("goal_id"),
  familyMemberId: integer("family_member_id"),
  issueId: integer("issue_id"),
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"), // daily, weekly
  targetCount: integer("target_count").notNull().default(1),
  status: text("status").notNull().default("active"), // active, paused, archived
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

// Dedicated routine analysis — backs /routines/[slug] deep analysis.
// Follows the same text-JSON convention as deepIssueAnalyses / deepAnalyses.
export const routineAnalyses = pgTable("routine_analyses", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  jobId: text("job_id"),
  summary: text("summary").notNull(),
  adherencePatterns: text("adherence_patterns").notNull().default("[]"), // JSON
  routineBalance: text("routine_balance").notNull().default("{}"), // JSON
  streaks: text("streaks").notNull().default("{}"), // JSON
  gaps: text("gaps").notNull().default("[]"), // JSON
  optimizationSuggestions: text("optimization_suggestions").notNull().default("[]"), // JSON
  researchRelevance: text("research_relevance").notNull().default("[]"), // JSON
  dataSnapshot: text("data_snapshot").notNull().default("{}"), // JSON
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  loggedDate: text("logged_date").notNull(), // YYYY-MM-DD
  count: integer("count").notNull().default(1),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
});

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const journalAnalyses = pgTable("journal_analyses", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull(),
  userId: text("user_id").notNull(),
  summary: text("summary").notNull(),
  emotionalLandscape: text("emotional_landscape").notNull(), // JSON
  therapeuticInsights: text("therapeutic_insights").notNull(), // JSON
  actionableRecommendations: text("actionable_recommendations").notNull(), // JSON
  reflectionPrompts: text("reflection_prompts").notNull(), // JSON
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const discussionGuides = pgTable("discussion_guides", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull(),
  userId: text("user_id").notNull(),
  childAge: integer("child_age"),
  behaviorSummary: text("behavior_summary").notNull(),
  developmentalContext: text("developmental_context").notNull(), // JSON
  conversationStarters: text("conversation_starters").notNull(), // JSON array
  talkingPoints: text("talking_points").notNull(), // JSON array
  languageGuide: text("language_guide").notNull(), // JSON {whatToSay, whatNotToSay}
  anticipatedReactions: text("anticipated_reactions").notNull(), // JSON array
  followUpPlan: text("follow_up_plan").notNull(), // JSON array
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const bogdanDiscussionGuides = pgTable("bogdan_discussion_guides", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  familyMemberId: integer("family_member_id").notNull(),
  childAge: integer("child_age"),
  behaviorSummary: text("behavior_summary").notNull(),
  developmentalContext: text("developmental_context").notNull(), // JSON
  conversationStarters: text("conversation_starters").notNull(), // JSON array
  talkingPoints: text("talking_points").notNull(), // JSON array
  languageGuide: text("language_guide").notNull(), // JSON {whatToSay, whatNotToSay}
  anticipatedReactions: text("anticipated_reactions").notNull(), // JSON array
  followUpPlan: text("follow_up_plan").notNull(), // JSON array
  citations: text("citations").notNull().default("[]"), // JSON array of Citation
  critique: text("critique"), // JSON nullable — { scores, weakSections, refined }
  model: text("model").notNull().default("deepseek-chat"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const affirmations = pgTable("affirmations", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  text: text("text").notNull(),
  category: text("category").notNull().default("encouragement"), // gratitude, strength, encouragement, growth, self-worth
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const familyMemberCharacteristics = pgTable("family_member_characteristics", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity"),
  frequencyPerWeek: integer("frequency_per_week"),
  durationWeeks: integer("duration_weeks"),
  ageOfOnset: integer("age_of_onset"),
  impairmentDomains: text("impairment_domains"),
  externalizedName: text("externalized_name"),
  strengths: text("strengths"),
  riskTier: text("risk_tier").notNull().default("NONE"),
  tags: text("tags"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  goalId: integer("goal_id"),
  issueId: integer("issue_id"),
  familyMemberId: integer("family_member_id"),
  type: text("type").notNull(), // CBT_REFRAME | MINDFULNESS | JOURNAL_PROMPT
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // JSON — shape depends on type
  language: text("language"),
  estimatedMinutes: integer("estimated_minutes"),
  source: text("source").notNull().default("USER"), // SEED | USER | AI
  createdAt: text("created_at")
    .notNull()
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const gameCompletions = pgTable("game_completions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  userId: text("user_id").notNull(),
  durationSeconds: integer("duration_seconds"),
  responses: text("responses"), // JSON — user's reframes / journal text / etc.
  linkedNoteId: integer("linked_note_id"),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`NOW()`),
});

// ═══════════════════════════════════════════════════════════════════
// Healthcare domain (merged from agentic-healthcare 2026-04-27)
// userId is opaque text from Neon Auth — no FK
// familyMemberId references research-thera familyMembers (serial int)
// ═══════════════════════════════════════════════════════════════════

export const bloodTests = pgTable(
  "blood_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    familyMemberId: integer("family_member_id").references(() => familyMembers.id, {
      onDelete: "set null",
    }),
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
    index("blood_tests_family_idx").on(table.familyMemberId),
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
    userId: text("user_id").notNull(),
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
    userId: text("user_id").notNull(),
    familyMemberId: integer("family_member_id").references(
      () => familyMembers.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    dosage: text("dosage"),
    frequency: text("frequency"),
    notes: text("notes"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medications_user_idx").on(table.userId),
    index("medications_family_member_idx").on(table.familyMemberId),
  ],
);

export const symptoms = pgTable(
  "symptoms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    description: text("description").notNull(),
    severity: text("severity"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("symptoms_user_idx").on(table.userId)],
);

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    specialty: text("specialty"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("doctors_user_idx").on(table.userId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    familyMemberId: integer("family_member_id").references(() => familyMembers.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    provider: text("provider"),
    notes: text("notes"),
    appointmentDate: date("appointment_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("appointments_user_idx").on(table.userId)],
);

export const familyMemberDoctors = pgTable(
  "family_member_doctors",
  {
    familyMemberId: integer("family_member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.familyMemberId, table.doctorId] }),
    index("fmd_family_idx").on(table.familyMemberId),
    index("fmd_doctor_idx").on(table.doctorId),
  ],
);

export const medicalLetters = pgTable(
  "medical_letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    description: text("description"),
    letterDate: date("letter_date"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medical_letters_user_idx").on(table.userId),
    index("medical_letters_doctor_idx").on(table.doctorId),
  ],
);

export const familyDocuments = pgTable(
  "family_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    familyMemberId: integer("family_member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    documentType: text("document_type").notNull(),
    documentDate: date("document_date"),
    source: text("source"),
    content: text("content"),
    externalUrl: text("external_url"),
    fileName: text("file_name"),
    filePath: text("file_path"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("family_docs_user_idx").on(table.userId),
    index("family_docs_member_idx").on(table.familyMemberId),
    index("family_docs_date_idx").on(table.documentDate),
  ],
);

// ── Healthcare embedding tables (1024-dim, FastEmbed bge-large-en-v1.5)

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

export const allergies = pgTable(
  "allergies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    familyMemberId: integer("family_member_id").references(() => familyMembers.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull().default("allergy"),
    name: text("name").notNull(),
    severity: text("severity"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("allergies_user_idx").on(table.userId),
    index("allergies_family_idx").on(table.familyMemberId),
  ],
);

export const allergyEmbeddings = pgTable(
  "allergy_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    allergyId: uuid("allergy_id")
      .notNull()
      .references(() => allergies.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("allergy_emb_user_idx").on(table.userId)],
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

// ── Health research (unified condition / protocol / memory)

export const healthResearches = pgTable(
  "health_researches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(), // "condition" | "protocol" | "memory"
    entityId: uuid("entity_id"),
    papers: jsonb("papers").notNull().default([]),
    synthesis: text("synthesis"),
    paperCount: text("paper_count"),
    searchQuery: text("search_query"),
    supplementFindings: jsonb("supplement_findings").notNull().default([]),
    supplementCount: text("supplement_count"),
    status: text("status").notNull().default("completed"),
    errorMessage: text("error_message"),
    durationMs: text("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("health_res_user_idx").on(table.userId),
    index("health_res_type_idx").on(table.type),
    index("health_res_entity_idx").on(table.entityId),
    index("health_res_status_idx").on(table.status),
  ],
);

// ── Brain Health Protocols

export const brainHealthProtocols = pgTable(
  "brain_health_protocols",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    targetAreas: jsonb("target_areas").notNull().default([]),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bhp_user_idx").on(table.userId),
    index("bhp_status_idx").on(table.status),
  ],
);

export const protocolSupplements = pgTable(
  "protocol_supplements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => brainHealthProtocols.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dosage: text("dosage").notNull(),
    frequency: text("frequency").notNull(),
    mechanism: text("mechanism"),
    targetAreas: jsonb("target_areas").notNull().default([]),
    notes: text("notes"),
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ps_protocol_idx").on(table.protocolId)],
);

export const cognitiveBaselines = pgTable(
  "cognitive_baselines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => brainHealthProtocols.id, { onDelete: "cascade" })
      .unique(),
    memoryScore: real("memory_score"),
    focusScore: real("focus_score"),
    processingSpeedScore: real("processing_speed_score"),
    moodScore: real("mood_score"),
    sleepScore: real("sleep_score"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cb_protocol_idx").on(table.protocolId)],
);

export const cognitiveCheckIns = pgTable(
  "cognitive_check_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => brainHealthProtocols.id, { onDelete: "cascade" }),
    memoryScore: real("memory_score"),
    focusScore: real("focus_score"),
    processingSpeedScore: real("processing_speed_score"),
    moodScore: real("mood_score"),
    sleepScore: real("sleep_score"),
    sideEffects: text("side_effects"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cci_protocol_idx").on(table.protocolId),
    index("cci_recorded_idx").on(table.recordedAt),
  ],
);

// ── Brain / Memory Tracking

export const memoryEntries = pgTable(
  "memory_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    overallScore: real("overall_score"),
    shortTermScore: real("short_term_score"),
    longTermScore: real("long_term_score"),
    workingMemoryScore: real("working_memory_score"),
    recallSpeed: real("recall_speed"),
    category: text("category").notNull().default("observation"),
    description: text("description"),
    context: text("context"),
    protocolId: uuid("protocol_id").references(() => brainHealthProtocols.id, {
      onDelete: "set null",
    }),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("me_user_idx").on(table.userId),
    index("me_logged_idx").on(table.loggedAt),
    index("me_category_idx").on(table.category),
  ],
);

export const memoryBaseline = pgTable(
  "memory_baseline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    overallScore: real("overall_score"),
    shortTermScore: real("short_term_score"),
    longTermScore: real("long_term_score"),
    workingMemoryScore: real("working_memory_score"),
    recallSpeed: real("recall_speed"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("mb_user_idx").on(table.userId)],
);

// ── Medication deep-research fact tables ──────────────────────────
// Drug-level (universal) facts keyed on `drug_slug` = first-word lowercased
// of the medication name. Populated by the medication_deep_research LangGraph.

export const medicationPharmacology = pgTable("medication_pharmacology", {
  drugSlug: text("drug_slug").primaryKey(),
  genericName: text("generic_name"),
  brandNames: jsonb("brand_names").notNull().default(sql`'[]'::jsonb`),
  atcCode: text("atc_code"),
  moa: text("moa"),
  halfLife: text("half_life"),
  peakTime: text("peak_time"),
  metabolism: text("metabolism"),
  excretion: text("excretion"),
  sourceUrl: text("source_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medicationIndications = pgTable(
  "medication_indications",
  {
    id: serial("id").primaryKey(),
    drugSlug: text("drug_slug").notNull(),
    kind: text("kind").notNull(),
    condition: text("condition").notNull(),
    evidenceLevel: text("evidence_level"),
    source: text("source"),
    sourceUrl: text("source_url"),
    confidence: integer("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medication_indications_slug_idx").on(table.drugSlug),
    uniqueIndex("medication_indications_dedup_idx").on(table.drugSlug, table.kind, table.condition),
  ],
);

export const medicationDosing = pgTable(
  "medication_dosing",
  {
    id: serial("id").primaryKey(),
    drugSlug: text("drug_slug").notNull(),
    population: text("population").notNull(),
    ageBand: text("age_band"),
    weightBand: text("weight_band"),
    doseText: text("dose_text").notNull(),
    frequency: text("frequency"),
    maxDaily: text("max_daily"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("medication_dosing_slug_idx").on(table.drugSlug)],
  // medication_dosing_dedup_idx exists in DB as a UNIQUE INDEX over expressions
  // (COALESCE on age_band/weight_band) — drizzle-kit can't model expression
  // indexes today, so it's intentionally omitted here.
);

export const medicationAdverseEvents = pgTable(
  "medication_adverse_events",
  {
    id: serial("id").primaryKey(),
    drugSlug: text("drug_slug").notNull(),
    event: text("event").notNull(),
    frequencyBand: text("frequency_band").notNull(),
    severity: text("severity"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medication_adverse_events_slug_idx").on(table.drugSlug),
    uniqueIndex("medication_adverse_events_dedup_idx").on(table.drugSlug, table.event, table.frequencyBand),
  ],
);

export const medicationInteractions = pgTable(
  "medication_interactions",
  {
    id: serial("id").primaryKey(),
    drugSlug: text("drug_slug").notNull(),
    interactingDrug: text("interacting_drug").notNull(),
    severity: text("severity").notNull(),
    mechanism: text("mechanism"),
    recommendation: text("recommendation"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medication_interactions_slug_idx").on(table.drugSlug),
    uniqueIndex("medication_interactions_dedup_idx").on(table.drugSlug, table.interactingDrug),
  ],
);

export const conditionDeepResearch = pgTable(
  "condition_deep_research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    familyMemberId: integer("family_member_id").references(() => familyMembers.id, {
      onDelete: "cascade",
    }),
    conditionSlug: text("condition_slug").notNull(),
    conditionName: text("condition_name").notNull(),
    language: text("language").notNull().default("ro"),
    pathophysiology: jsonb("pathophysiology"),
    ageManifestations: jsonb("age_manifestations"),
    evidenceBasedTreatments: jsonb("evidence_based_treatments"),
    comorbidities: jsonb("comorbidities"),
    redFlags: jsonb("red_flags"),
    proximityAssessment: jsonb("proximity_assessment"),
    criteriaMatch: jsonb("criteria_match"),
    sourceUrls: jsonb("source_urls").notNull().default(sql`'[]'::jsonb`),
    freshUntil: timestamp("fresh_until", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("condition_deep_research_user_idx").on(table.userId),
    index("condition_deep_research_fm_idx").on(table.familyMemberId),
    uniqueIndex("condition_deep_research_dedup_idx").on(
      table.userId,
      table.familyMemberId,
      table.conditionSlug,
      table.language,
    ),
  ],
);

export const medicationCorrelations = pgTable(
  "medication_correlations",
  {
    id: serial("id").primaryKey(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    familyMemberId: integer("family_member_id").references(() => familyMembers.id, {
      onDelete: "set null",
    }),
    relatedEntityType: text("related_entity_type").notNull(),
    relatedEntityId: integer("related_entity_id").notNull(),
    correlationType: text("correlation_type").notNull(),
    confidence: integer("confidence").notNull().default(50),
    rationale: text("rationale"),
    matchedFact: text("matched_fact"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medication_correlations_med_idx").on(table.medicationId),
    index("medication_correlations_fm_idx").on(table.familyMemberId),
    uniqueIndex("medication_correlations_dedup_idx").on(
      table.medicationId,
      table.relatedEntityType,
      table.relatedEntityId,
      table.correlationType,
    ),
  ],
);

export const regimenAnalysis = pgTable(
  "regimen_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    slug: text("slug").notNull(),
    severityOverall: text("severity_overall"),
    summary: text("summary"),
    flags: jsonb("flags").notNull().default(sql`'[]'::jsonb`),
    missingFacts: jsonb("missing_facts").notNull().default(sql`'[]'::jsonb`),
    medsCount: integer("meds_count").notNull().default(0),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("regimen_analysis_user_idx").on(table.userId),
    uniqueIndex("regimen_analysis_user_slug_unique").on(table.userId, table.slug),
  ],
);
