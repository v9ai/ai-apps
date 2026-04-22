import { pgTable, index, unique, serial, integer, text, vector, jsonb, timestamp, foreignKey, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const researchEmbeddings = pgTable("research_embeddings", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id"),
	entityType: text("entity_type").notNull(),
	entityId: integer("entity_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("research_embeddings_embedding_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	unique("research_embeddings_entity_type_entity_id_key").on(table.entityType, table.entityId),
]);

export const claimCards = pgTable("claim_cards", {
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
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const notesClaims = pgTable("notes_claims", {
	noteId: integer("note_id").notNull(),
	claimId: text("claim_id").notNull(),
	createdAt: text("created_at").default(now()).notNull(),
});

export const journalEntries = pgTable("journal_entries", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	familyMemberId: integer("family_member_id"),
	title: text(),
	content: text().notNull(),
	mood: text(),
	moodScore: integer("mood_score"),
	tags: text(),
	goalId: integer("goal_id"),
	isPrivate: integer("is_private").default(1).notNull(),
	entryDate: text("entry_date").notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const behaviorObservations = pgTable("behavior_observations", {
	id: serial().primaryKey().notNull(),
	familyMemberId: integer("family_member_id").notNull(),
	goalId: integer("goal_id"),
	issueId: integer("issue_id"),
	userId: text("user_id").notNull(),
	observedAt: text("observed_at").notNull(),
	observationType: text("observation_type").notNull(),
	frequency: integer(),
	intensity: text(),
	context: text(),
	notes: text(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const uniqueOutcomes = pgTable("unique_outcomes", {
	id: serial().primaryKey().notNull(),
	issueId: integer("issue_id").notNull(),
	userId: text("user_id").notNull(),
	observedAt: text("observed_at").notNull(),
	description: text().notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const userSettings = pgTable("user_settings", {
	userId: text("user_id").primaryKey().notNull(),
	storyLanguage: text("story_language").default('English').notNull(),
	storyMinutes: integer("story_minutes").default(10).notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const relationships = pgTable("relationships", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: integer("subject_id").notNull(),
	relatedType: text("related_type").notNull(),
	relatedId: integer("related_id").notNull(),
	relationshipType: text("relationship_type").notNull(),
	context: text(),
	startDate: text("start_date"),
	status: text().default('active'),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const familyMembers = pgTable("family_members", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	slug: text(),
	firstName: text("first_name").notNull(),
	name: text(),
	ageYears: integer("age_years"),
	relationship: text(),
	dateOfBirth: text("date_of_birth"),
	bio: text(),
	email: text(),
	phone: text(),
	location: text(),
	occupation: text(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
}, (table) => [
	unique("family_members_slug_key").on(table.slug),
]);

export const familyMemberShares = pgTable("family_member_shares", {
	familyMemberId: integer("family_member_id").notNull(),
	email: text().notNull(),
	role: text().default('EDITOR').notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	createdBy: text("created_by").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.familyMemberId],
			foreignColumns: [familyMembers.id],
			name: "family_member_shares_family_member_id_fkey"
		}).onDelete("cascade"),
]);

export const contacts = pgTable("contacts", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	slug: text(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name"),
	role: text(),
	ageYears: integer("age_years"),
	notes: text(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
}, (table) => [
	unique("contacts_slug_key").on(table.slug),
]);

export const issues = pgTable("issues", {
	id: serial().primaryKey().notNull(),
	feedbackId: integer("feedback_id"),
	familyMemberId: integer("family_member_id").notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	category: text().notNull(),
	severity: text().notNull(),
	recommendations: text(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
	relatedFamilyMemberId: integer("related_family_member_id"),
	journalEntryId: integer("journal_entry_id"),
}, (table) => [
	foreignKey({
			columns: [table.relatedFamilyMemberId],
			foreignColumns: [familyMembers.id],
			name: "issues_related_family_member_id_fkey"
		}).onDelete("set null"),
]);

export const contactFeedbacks = pgTable("contact_feedbacks", {
	id: serial().primaryKey().notNull(),
	contactId: integer("contact_id").notNull(),
	familyMemberId: integer("family_member_id").notNull(),
	userId: text("user_id").notNull(),
	subject: text(),
	feedbackDate: text("feedback_date").notNull(),
	content: text().notNull(),
	tags: text(),
	source: text(),
	extracted: integer().default(0).notNull(),
	extractedIssues: text("extracted_issues"),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const teacherFeedbacks = pgTable("teacher_feedbacks", {
	id: serial().primaryKey().notNull(),
	familyMemberId: integer("family_member_id").notNull(),
	userId: text("user_id").notNull(),
	teacherName: text("teacher_name").notNull(),
	subject: text(),
	feedbackDate: text("feedback_date").notNull(),
	content: text().notNull(),
	tags: text(),
	source: text(),
	extracted: integer().default(0).notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const therapyResearch = pgTable("therapy_research", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id"),
	feedbackId: integer("feedback_id"),
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
	issueId: integer("issue_id"),
	relevanceScore: integer("relevance_score").notNull(),
	extractedBy: text("extracted_by").notNull(),
	extractionConfidence: integer("extraction_confidence").notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
	embedding: vector({ dimensions: 384 }),
}, (table) => [
	index("idx_therapy_research_embedding").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "10"}),
]);

export const therapeuticQuestions = pgTable("therapeutic_questions", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id").notNull(),
	question: text().notNull(),
	researchId: integer("research_id"),
	researchTitle: text("research_title"),
	rationale: text().notNull(),
	generatedAt: text("generated_at").notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const notes = pgTable("notes", {
	id: serial().primaryKey().notNull(),
	entityId: integer("entity_id").notNull(),
	entityType: text("entity_type").notNull(),
	userId: text("user_id").notNull(),
	noteType: text("note_type"),
	slug: text(),
	title: text(),
	content: text().notNull(),
	createdBy: text("created_by"),
	tags: text(),
	visibility: text().default('PRIVATE').notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
}, (table) => [
	unique("notes_slug_key").on(table.slug),
]);

export const noteShares = pgTable("note_shares", {
	noteId: integer("note_id").notNull(),
	email: text().notNull(),
	role: text().default('READER').notNull(),
	createdAt: text("created_at").default(now()).notNull(),
	createdBy: text("created_by").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [notes.id],
			name: "note_shares_note_id_fkey"
		}).onDelete("cascade"),
]);

export const goals = pgTable("goals", {
	id: serial().primaryKey().notNull(),
	familyMemberId: integer("family_member_id"),
	userId: text("user_id").notNull(),
	slug: text(),
	title: text().notNull(),
	description: text(),
	targetDate: text("target_date"),
	status: text().default('active').notNull(),
	priority: text().default('medium').notNull(),
	therapeuticText: text("therapeutic_text"),
	therapeuticTextLanguage: text("therapeutic_text_language"),
	therapeuticTextGeneratedAt: text("therapeutic_text_generated_at"),
	storyLanguage: text("story_language"),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
}, (table) => [
	unique("goals_slug_key").on(table.slug),
]);

export const stories = pgTable("stories", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id"),
	userId: text("user_id"),
	content: text().notNull(),
	audioKey: text("audio_key"),
	audioUrl: text("audio_url"),
	audioGeneratedAt: text("audio_generated_at"),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
	issueId: integer("issue_id"),
	feedbackId: integer("feedback_id"),
	language: text(),
	minutes: integer(),
}, (table) => [
	foreignKey({
			columns: [table.goalId],
			foreignColumns: [goals.id],
			name: "stories_goal_id_fkey"
		}).onDelete("cascade"),
]);

export const textSegments = pgTable("text_segments", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id").notNull(),
	storyId: integer("story_id"),
	idx: integer().notNull(),
	text: text().notNull(),
	createdAt: text("created_at").default(now()).notNull(),
});

export const generationJobs = pgTable("generation_jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	goalId: integer("goal_id"),
	storyId: integer("story_id"),
	status: text().notNull(),
	progress: integer().default(0).notNull(),
	result: text(),
	error: text(),
	createdAt: text("created_at").default(now()).notNull(),
	updatedAt: text("updated_at").default(now()).notNull(),
});

export const audioAssets = pgTable("audio_assets", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	goalId: integer("goal_id").notNull(),
	storyId: integer("story_id"),
	language: text().notNull(),
	voice: text().notNull(),
	mimeType: text("mime_type").notNull(),
	manifest: text().notNull(),
	createdAt: text("created_at").default(now()).notNull(),
});

export const notesResearch = pgTable("notes_research", {
	noteId: integer("note_id").notNull(),
	researchId: integer("research_id").notNull(),
	createdAt: text("created_at").default(now()).notNull(),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().notNull(),
	image: text(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	unique("user_email_key").on(table.email),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onDelete("cascade"),
	unique("session_token_key").on(table.token),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }),
});
