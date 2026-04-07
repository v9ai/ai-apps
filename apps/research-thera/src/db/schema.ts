import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").unique(),
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
    .default(sql`NOW()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`NOW()`),
});

export const familyMemberShares = pgTable("family_member_shares", {
  familyMemberId: integer("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // normalized lower(trim(email))
  role: text("role").notNull().default("VIEWER"), // VIEWER or EDITOR
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

