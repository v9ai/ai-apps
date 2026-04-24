import {
  pgTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  serial,
  boolean,
  vector,
  jsonb,
  timestamp,
  numeric,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// Re-export Better Auth tables (user, session, account, verification)
export { user, session, account, verification } from "@ai-apps/auth/schema";

// Company intelligence tables live in the shared package so other apps
// (knowledge, research-thera, ...) can consume the same schema + types.
// Drizzle Kit follows re-exports, so migrations are still generated from here.
export {
  companies,
  companyFacts,
  contacts,
} from "@ai-apps/company-intel/schema";
export type {
  Company,
  NewCompany,
  CompanyFact,
  NewCompanyFact,
  Contact,
  NewContact,
} from "@ai-apps/company-intel/schema";

// Local imports for relations() and references() below.
import {
  companies,
  companyFacts,
  contacts,
} from "@ai-apps/company-intel/schema";

// Tenant column — used by the lead-gen-owned tables below for Postgres RLS.
// Default reads the per-request session GUC `app.tenant` set in withTenantDb();
// when no GUC is set (scripts / admin), falls back to 'vadim' so existing tools keep working.
const tenantIdColumn = () =>
  text("tenant_id")
    .notNull()
    .default(sql`COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim')`);

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull().unique(), // Better Auth user ID
  email_notifications: boolean("email_notifications")
    .notNull()
    .default(true),
  daily_digest: boolean("daily_digest")
    .notNull()
    .default(false),
  excluded_companies: text("excluded_companies"), // JSON array
  dark_mode: boolean("dark_mode")
    .notNull()
    .default(true),
  created_at: text("created_at")
    .notNull()
    .default(sql`now()::text`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`now()::text`),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// companyFacts — moved to @ai-apps/company-intel/schema (re-exported at top of file)

// Company Snapshots (Crawl storage for debugging/reprocessing)
export const companySnapshots = pgTable(
  "company_snapshots",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    source_url: text("source_url").notNull(),
    crawl_id: text("crawl_id"),
    capture_timestamp: text("capture_timestamp"),
    fetched_at: text("fetched_at").notNull(),

    http_status: integer("http_status"),
    mime: text("mime"),
    content_hash: text("content_hash"),

    text_sample: text("text_sample"), // First N chars
    jsonld: text("jsonld"), // JSON parsed JSON-LD
    extracted: text("extracted"), // JSON extractor output

    // Evidence
    source_type: text("source_type", {
      enum: ["COMMONCRAWL", "LIVE_FETCH", "MANUAL", "PARTNER", "BRAVE_SEARCH"],
    }).notNull(),
    method: text("method", {
      enum: ["JSONLD", "META", "DOM", "HEURISTIC", "LLM"],
    }).notNull(),
    extractor_version: text("extractor_version"),

    // WARC pointer
    warc_filename: text("warc_filename"),
    warc_offset: integer("warc_offset"),
    warc_length: integer("warc_length"),
    warc_digest: text("warc_digest"),

    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_company_snapshots_company_hash").on(table.company_id, table.content_hash),
  ],
);

export type CompanySnapshot = typeof companySnapshots.$inferSelect;
export type NewCompanySnapshot = typeof companySnapshots.$inferInsert;

// contacts — moved to @ai-apps/company-intel/schema (re-exported at top of file)

// Contact Reminders (explicit dated reminders per contact)
export const reminders = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    entity_type: text("entity_type").notNull(), // contact | company | ...
    entity_id: integer("entity_id").notNull(),
    remind_at: text("remind_at").notNull(),
    recurrence: text("recurrence").notNull().default("none"), // none | weekly | biweekly | monthly
    note: text("note"),
    status: text("status").notNull().default("pending"), // pending | snoozed | done
    snoozed_until: text("snoozed_until"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    entityIdx: index("idx_reminders_entity").on(table.entity_type, table.entity_id),
    remindAtIdx: index("idx_reminders_remind_at").on(table.remind_at),
    statusIdx: index("idx_reminders_status").on(table.status),
  }),
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;

// Contact Emails (outbound emails sent to a contact)
export const contactEmails = pgTable(
  "contact_emails",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    contact_id: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    resend_id: text("resend_id").notNull(),
    from_email: text("from_email").notNull(),
    to_emails: text("to_emails").notNull(), // JSON array
    subject: text("subject").notNull(),
    text_content: text("text_content"),
    status: text("status").notNull().default("sent"),
    sent_at: text("sent_at"),
    scheduled_at: text("scheduled_at"),
    delivered_at: text("delivered_at"),
    opened_at: text("opened_at"),
    recipient_name: text("recipient_name"),
    error_message: text("error_message"),
    // Follow-up sequence tracking
    parent_email_id: integer("parent_email_id"),
    sequence_type: text("sequence_type"), // "initial" | "followup_1" | "followup_2" | "followup_3"
    sequence_number: text("sequence_number"), // "0", "1", "2", "3"
    reply_received: boolean("reply_received").default(false),
    reply_received_at: text("reply_received_at"),
    followup_status: text("followup_status"), // "pending" | "completed"
    // Entity linking (for non-contact emails like company batches)
    company_id: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    // Extended fields (ported from CRM)
    cc_emails: text("cc_emails").default("[]"), // JSON array
    reply_to_emails: text("reply_to_emails").default("[]"), // JSON array
    html_content: text("html_content"),
    attachments: text("attachments").default("[]"), // JSON array
    tags: text("tags").default("[]"), // JSON array
    headers: text("headers").default("[]"), // JSON array
    idempotency_key: text("idempotency_key"),
    // Reply classification (populated when a received email is matched to this outbound)
    reply_classification: text("reply_classification"), // interested | not_interested | auto_reply | bounced | info_request | unsubscribe
    // Link to the received email this outbound is replying to
    in_reply_to_received_id: integer("in_reply_to_received_id")
      .references((): AnyPgColumn => receivedEmails.id, { onDelete: "set null" }),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    contactIdIdx: index("idx_contact_emails_contact_id").on(table.contact_id),
    resendIdIdx: index("idx_contact_emails_resend_id").on(table.resend_id),
    statusIdx: index("idx_contact_emails_status").on(table.status),
    companyIdIdx: index("idx_contact_emails_company_id").on(table.company_id),
    parentEmailIdIdx: index("idx_contact_emails_parent_email_id").on(table.parent_email_id),
    inReplyToReceivedIdx: index("idx_contact_emails_in_reply_to_received").on(table.in_reply_to_received_id),
  }),
);

export type ContactEmail = typeof contactEmails.$inferSelect;
export type NewContactEmail = typeof contactEmails.$inferInsert;


// Email Campaigns (CRM — automated email sequences)
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: text("id").primaryKey(), // campaign_<timestamp>_<random>
    tenant_id: tenantIdColumn(),
    company_id: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    product_id: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    product_aware_mode: boolean("product_aware_mode").notNull().default(false),
    persona_match_threshold: real("persona_match_threshold"),
    name: text("name").notNull(),
    status: text("status", {
      enum: ["draft", "pending", "running", "completed", "failed", "stopped"],
    }).notNull().default("draft"),
    sequence: text("sequence"), // JSON array of email steps
    delay_days: text("delay_days"), // JSON array of delays between steps
    start_at: text("start_at"),
    mode: text("mode"), // "sequential" | "blast"
    from_email: text("from_email"),
    reply_to: text("reply_to"),
    total_recipients: integer("total_recipients").notNull().default(0),
    emails_sent: integer("emails_sent").notNull().default(0),
    emails_scheduled: integer("emails_scheduled").notNull().default(0),
    emails_failed: integer("emails_failed").notNull().default(0),
    recipient_emails: text("recipient_emails"), // JSON array
    // Extended fields (ported from CRM)
    total_emails_planned: integer("total_emails_planned"),
    add_unsubscribe_headers: integer("add_unsubscribe_headers").notNull().default(0),
    unsubscribe_url: text("unsubscribe_url"),
    add_anti_thread_header: integer("add_anti_thread_header").notNull().default(0),
    created_by: text("created_by"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    companyIdIdx: index("idx_email_campaigns_company_id").on(table.company_id),
    productIdIdx: index("idx_email_campaigns_product_id").on(table.product_id),
    statusIdx: index("idx_email_campaigns_status").on(table.status),
  }),
);

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;

// Email Templates (CRM — reusable email templates)
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    name: text("name").notNull(),
    description: text("description"),
    subject: text("subject"),
    html_content: text("html_content"),
    text_content: text("text_content"),
    category: text("category"),
    tags: text("tags"), // JSON array
    variables: text("variables"), // JSON array of variable names
    is_active: boolean("is_active").notNull().default(true),
    user_id: text("user_id"), // Template owner
    product_id: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    persona_title: text("persona_title"),
    channel: text("channel"),
    source: text("source"), // "gtm_graph" | "user"
    template_key: text("template_key"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    categoryIdx: index("idx_email_templates_category").on(table.category),
    templateKeyIdx: uniqueIndex("idx_email_templates_template_key").on(table.template_key),
  }),
);

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

// Received Emails (inbound emails persisted from Resend webhooks)
export const receivedEmails = pgTable(
  "received_emails",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    resend_id: text("resend_id").unique(),
    source: text("source").notNull().default("email"), // email | linkedin_dm
    from_email: text("from_email"),
    to_emails: text("to_emails").notNull().default("[]"), // JSON array
    cc_emails: text("cc_emails").default("[]"), // JSON array
    reply_to_emails: text("reply_to_emails").default("[]"), // JSON array
    subject: text("subject"),
    message_id: text("message_id"),
    html_content: text("html_content"),
    text_content: text("text_content"),
    attachments: text("attachments").default("[]"), // JSON array
    received_at: text("received_at").notNull(),
    archived_at: text("archived_at"),
    // Reply classification (ML — logistic regression)
    classification: text("classification"), // interested | not_interested | auto_reply | bounced | info_request | unsubscribe
    classification_confidence: real("classification_confidence"),
    classified_at: text("classified_at"),
    // Contact matching
    matched_contact_id: integer("matched_contact_id").references(() => contacts.id, { onDelete: "set null" }),
    matched_outbound_id: integer("matched_outbound_id").references(
      (): AnyPgColumn => contactEmails.id,
      { onDelete: "set null" },
    ),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    fromEmailIdx: index("idx_received_emails_from").on(table.from_email),
    messageIdIdx: index("idx_received_emails_message_id").on(table.message_id),
    receivedAtIdx: index("idx_received_emails_received_at").on(table.received_at),
    resendIdIdx: index("idx_received_emails_resend_id").on(table.resend_id),
    classificationIdx: index("idx_received_emails_classification").on(table.classification),
  }),
);

export type ReceivedEmail = typeof receivedEmails.$inferSelect;
export type NewReceivedEmail = typeof receivedEmails.$inferInsert;

// LinkedIn Posts (unified table for posts and job listings — jobs have type='job')
export const linkedinPosts = pgTable(
  "linkedin_posts",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    type: text("type", { enum: ["post", "job"] }).notNull().default("post"),
    url: text("url").notNull(),           // LinkedIn canonical URL (unique)

    company_id: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    contact_id: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),

    title: text("title"),                 // job title or post headline
    content: text("content"),            // full post text or job description
    author_name: text("author_name"),    // display name
    author_url: text("author_url"),      // author LinkedIn profile URL

    location: text("location"),          // job: location string
    employment_type: text("employment_type"), // job: full-time / contract / etc.

    posted_at: text("posted_at"),        // when posted on LinkedIn (ISO)
    scraped_at: text("scraped_at").notNull().default(sql`now()::text`),

    raw_data: text("raw_data"),          // JSON blob for anything extra

    // TechWolf model analysis (JobBERT-v2 + ConTeXT skill extraction)
    skills: text("skills"),              // JSON array of ExtractedSkill[]
    analyzed_at: text("analyzed_at"),    // ISO timestamp of last TechWolf analysis
    // job_embedding vector(768) added via migration — accessed with raw SQL

    // --- Voyager API fields ---
    voyager_urn: text("voyager_urn"),                       // LinkedIn URN e.g. urn:li:fsd_jobPosting:12345
    voyager_workplace_type: text("voyager_workplace_type"), // "remote" | "hybrid" | "on-site"
    voyager_salary_min: integer("voyager_salary_min"),
    voyager_salary_max: integer("voyager_salary_max"),
    voyager_salary_currency: text("voyager_salary_currency"), // ISO 4217: "USD", "EUR", etc.
    voyager_apply_url: text("voyager_apply_url"),            // external apply URL
    voyager_poster_urn: text("voyager_poster_urn"),          // URN of the person who posted
    voyager_listed_at: text("voyager_listed_at"),            // epoch ms or ISO when LinkedIn listed it
    voyager_reposted: boolean("voyager_reposted").default(false),

    created_at: text("created_at").notNull().default(sql`now()::text`),
  },
  (table) => [
    uniqueIndex("idx_linkedin_posts_url").on(table.url),
    index("idx_linkedin_posts_type").on(table.type),
    index("idx_linkedin_posts_company_id").on(table.company_id),
    index("idx_linkedin_posts_contact_id").on(table.contact_id),
    uniqueIndex("idx_linkedin_posts_voyager_urn").on(table.voyager_urn),
    index("idx_linkedin_posts_workplace_type").on(table.voyager_workplace_type),
  ],
);

export type LinkedInPost = typeof linkedinPosts.$inferSelect;
export type NewLinkedInPost = typeof linkedinPosts.$inferInsert;

// Opportunities (job listings / contracts tracked for application pipeline)
export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(), // opp_<timestamp>_<random>
    tenant_id: tenantIdColumn(),
    title: text("title").notNull(),
    url: text("url"),
    source: text("source"), // linkedin | website | referral | etc.
    status: text("status").notNull().default("open"), // open | applied | interviewing | offer | rejected | closed
    reward_usd: real("reward_usd"),
    reward_text: text("reward_text"), // human-readable comp (e.g. "€130k + bonus")
    start_date: text("start_date"),
    end_date: text("end_date"),
    deadline: text("deadline"),
    first_seen: text("first_seen"),
    last_seen: text("last_seen"),
    score: integer("score"), // 0-100 fit score
    raw_context: text("raw_context"), // full job description text
    metadata: text("metadata"), // JSON blob for extra structured data
    applied: boolean("applied").notNull().default(false),
    applied_at: text("applied_at"),
    application_status: text("application_status"),
    application_notes: text("application_notes"),
    tags: text("tags"), // JSON array
    company_id: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    contact_id: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    companyIdIdx: index("idx_opportunities_company_id").on(table.company_id),
    contactIdIdx: index("idx_opportunities_contact_id").on(table.contact_id),
    statusIdx: index("idx_opportunities_status").on(table.status),
  }),
);

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;

// Intent Signals (company-level buying/hiring signals detected by finetuned Qwen)
export const intentSignals = pgTable(
  "intent_signals",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    signal_type: text("signal_type", {
      enum: [
        "hiring_intent",
        "tech_adoption",
        "growth_signal",
        "budget_cycle",
        "leadership_change",
        "product_launch",
        "competitor_mention",
      ],
    }).notNull(),
    source_type: text("source_type", {
      enum: [
        "job_posting",
        "web_content",
        "github_activity",
        "linkedin_post",
        "funding_event",
        "press_release",
        "company_snapshot",
      ],
    }).notNull(),
    source_url: text("source_url"),
    raw_text: text("raw_text").notNull(), // snippet that triggered detection
    evidence: text("evidence"), // JSON array of extracted evidence phrases
    confidence: real("confidence").notNull(), // 0..1
    detected_at: text("detected_at").notNull(), // ISO timestamp
    decays_at: text("decays_at").notNull(), // ISO timestamp = detected_at + decay_days
    decay_days: integer("decay_days").notNull(), // half-life for exponential decay
    metadata: text("metadata"), // JSON blob for signal-specific data
    model_version: text("model_version"), // adapter version or "logistic-v1"
    competitor_id: integer("competitor_id")
      .references((): AnyPgColumn => competitors.id, { onDelete: "set null" }),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_intent_signals_company_type").on(table.company_id, table.signal_type),
    index("idx_intent_signals_company_detected").on(table.company_id, table.detected_at),
    index("idx_intent_signals_decays_at").on(table.decays_at),
    index("idx_intent_signals_competitor").on(table.competitor_id, table.detected_at),
  ],
);

export type IntentSignal = typeof intentSignals.$inferSelect;
export type NewIntentSignal = typeof intentSignals.$inferInsert;

export const intentSignalProducts = pgTable(
  "intent_signal_products",
  {
    intent_signal_id: integer("intent_signal_id")
      .notNull()
      .references(() => intentSignals.id, { onDelete: "cascade" }),
    product_id: integer("product_id")
      .notNull()
      .references((): AnyPgColumn => products.id, { onDelete: "cascade" }),
    match_reason: text("match_reason"),
    match_score: real("match_score").notNull().default(1.0),
    tenant_id: tenantIdColumn(),
    created_at: text("created_at").default(sql`now()::text`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.intent_signal_id, t.product_id] }),
    productSignalIdx: index("idx_isp_product_signal").on(t.product_id, t.intent_signal_id),
  }),
);

export type IntentSignalProduct = typeof intentSignalProducts.$inferSelect;
export type NewIntentSignalProduct = typeof intentSignalProducts.$inferInsert;

// Voyager Job Counts (remote job count snapshots per company/query over time)
export const voyagerJobCounts = pgTable(
  "voyager_job_counts",
  {
    id: serial("id").primaryKey(),
    company_id: integer("company_id")
      .references(() => companies.id, { onDelete: "cascade" }),
    query: text("query").notNull(),               // search query used, e.g. "AI engineer remote"
    remote_count: integer("remote_count").notNull().default(0),
    total_count: integer("total_count").notNull().default(0),
    counted_at: text("counted_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_voyager_job_counts_company_id").on(table.company_id),
    index("idx_voyager_job_counts_query").on(table.query),
    index("idx_voyager_job_counts_counted_at").on(table.counted_at),
    index("idx_voyager_job_counts_company_query").on(table.company_id, table.query),
  ],
);

export type VoyagerJobCount = typeof voyagerJobCounts.$inferSelect;
export type NewVoyagerJobCount = typeof voyagerJobCounts.$inferInsert;

// Voyager Sessions (LinkedIn API session management — cookies + health tracking)
export const voyagerSessions = pgTable(
  "voyager_sessions",
  {
    id: serial("id").primaryKey(),
    session_id: text("session_id").notNull().unique(), // opaque identifier
    li_at: text("li_at").notNull(),                    // LinkedIn li_at cookie
    jsessionid: text("jsessionid").notNull(),          // JSESSIONID cookie
    csrf_token: text("csrf_token").notNull(),          // CSRF token
    user_agent: text("user_agent").notNull(),
    last_used: text("last_used")
      .notNull()
      .default(sql`now()::text`),
    request_count: integer("request_count").notNull().default(0),
    is_healthy: boolean("is_healthy").notNull().default(true),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_voyager_sessions_is_healthy").on(table.is_healthy),
    index("idx_voyager_sessions_last_used").on(table.last_used),
  ],
);

export type VoyagerSession = typeof voyagerSessions.$inferSelect;
export type NewVoyagerSession = typeof voyagerSessions.$inferInsert;

// Voyager Sync Log (tracks each sync operation — query, counts, timing, errors)
export const voyagerSyncLog = pgTable(
  "voyager_sync_log",
  {
    id: serial("id").primaryKey(),
    sync_id: text("sync_id").notNull().unique(),    // e.g. sync_<timestamp>_<random>
    query: text("query").notNull(),                  // search query used
    jobs_found: integer("jobs_found").notNull().default(0),
    jobs_new: integer("jobs_new").notNull().default(0),
    jobs_updated: integer("jobs_updated").notNull().default(0),
    started_at: text("started_at").notNull(),
    completed_at: text("completed_at"),
    errors: text("errors"),                          // JSON array of error strings
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_voyager_sync_log_started_at").on(table.started_at),
    index("idx_voyager_sync_log_query").on(table.query),
  ],
);

export type VoyagerSyncLog = typeof voyagerSyncLog.$inferSelect;
export type NewVoyagerSyncLog = typeof voyagerSyncLog.$inferInsert;

// Voyager Analytics Snapshots (daily aggregated market intelligence)
export const voyagerSnapshots = pgTable(
  "voyager_snapshots",
  {
    id: serial("id").primaryKey(),

    // Snapshot identity
    snapshot_date: text("snapshot_date").notNull(),  // YYYY-MM-DD
    query: text("query").notNull(),                  // search query / keyword

    // Core counts
    total_jobs: integer("total_jobs").notNull().default(0),
    remote_jobs: integer("remote_jobs").notNull().default(0),
    new_jobs_24h: integer("new_jobs_24h").notNull().default(0),
    reposted_jobs: integer("reposted_jobs").notNull().default(0),

    // Aggregated metrics (JSON)
    top_companies: text("top_companies"),             // JSON: { name, count, velocity }[]
    top_skills: text("top_skills"),                   // JSON: { skill, count, pctOfTotal }[]
    salary_data: text("salary_data"),                 // JSON: { min, max, median, currency, count }
    location_breakdown: text("location_breakdown"),   // JSON: { location, count, avgSalary? }[]
    industry_breakdown: text("industry_breakdown"),   // JSON: { industry, count, growthRate? }[]
    employment_types: text("employment_types"),       // JSON: { type, count }[]
    emerging_titles: text("emerging_titles"),         // JSON: { title, count, isNew }[]
    repost_analysis: text("repost_analysis"),         // JSON: { jobUrl, repostCount, daysSinceFirst }[]
    time_to_fill: text("time_to_fill"),              // JSON: { avgDays, medianDays, byIndustry }

    // Raw Voyager response metadata
    voyager_request_id: text("voyager_request_id"),
    raw_metadata: text("raw_metadata"),              // JSON blob for debugging

    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    uniqueIndex("idx_voyager_snapshots_date_query").on(table.snapshot_date, table.query),
    index("idx_voyager_snapshots_date").on(table.snapshot_date),
  ],
);

export type VoyagerSnapshot = typeof voyagerSnapshots.$inferSelect;
export type NewVoyagerSnapshot = typeof voyagerSnapshots.$inferInsert;

// ---------------------------------------------------------------------------
// Drizzle relations() declarations
// ---------------------------------------------------------------------------

export const companiesRelations = relations(companies, ({ many }) => ({
  companyFacts: many(companyFacts),
  companySnapshots: many(companySnapshots),
  contacts: many(contacts),
  emailCampaigns: many(emailCampaigns),
  linkedinPosts: many(linkedinPosts),
  intentSignals: many(intentSignals),
  voyagerJobCounts: many(voyagerJobCounts),
}));

export const companyFactsRelations = relations(companyFacts, ({ one }) => ({
  company: one(companies, {
    fields: [companyFacts.company_id],
    references: [companies.id],
  }),
}));

export const companySnapshotsRelations = relations(companySnapshots, ({ one }) => ({
  company: one(companies, {
    fields: [companySnapshots.company_id],
    references: [companies.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.company_id],
    references: [companies.id],
  }),
  emails: many(contactEmails),
  linkedinPosts: many(linkedinPosts),
}));

export const contactEmailsRelations = relations(contactEmails, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactEmails.contact_id],
    references: [contacts.id],
  }),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  company: one(companies, {
    fields: [emailCampaigns.company_id],
    references: [companies.id],
  }),
}));

export const intentSignalsRelations = relations(intentSignals, ({ one, many }) => ({
  company: one(companies, {
    fields: [intentSignals.company_id],
    references: [companies.id],
  }),
  competitor: one(competitors, {
    fields: [intentSignals.competitor_id],
    references: [competitors.id],
  }),
  products: many(intentSignalProducts),
}));

export const intentSignalProductsRelations = relations(
  intentSignalProducts,
  ({ one }) => ({
    signal: one(intentSignals, {
      fields: [intentSignalProducts.intent_signal_id],
      references: [intentSignals.id],
    }),
    product: one(products, {
      fields: [intentSignalProducts.product_id],
      references: [products.id],
    }),
  }),
);

export const linkedinPostsRelations = relations(linkedinPosts, ({ one }) => ({
  company: one(companies, {
    fields: [linkedinPosts.company_id],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [linkedinPosts.contact_id],
    references: [contacts.id],
  }),
}));

export const voyagerJobCountsRelations = relations(voyagerJobCounts, ({ one }) => ({
  company: one(companies, {
    fields: [voyagerJobCounts.company_id],
    references: [companies.id],
  }),
}));

export const voyagerSnapshotsRelations = relations(voyagerSnapshots, () => ({}));

// Reply Drafts (auto-generated reply drafts for user approval)
export const replyDrafts = pgTable(
  "reply_drafts",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    received_email_id: integer("received_email_id")
      .notNull()
      .references(() => receivedEmails.id, { onDelete: "cascade" }),
    contact_id: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "approved", "sent", "dismissed"],
    }).notNull().default("pending"),
    draft_type: text("draft_type", {
      enum: ["reply", "follow_up"],
    }).notNull().default("reply"),
    subject: text("subject").notNull(),
    body_text: text("body_text").notNull(),
    body_html: text("body_html"),
    generation_model: text("generation_model"),
    thread_context: text("thread_context"), // JSON of the conversation thread used for generation
    approved_at: text("approved_at"),
    sent_at: text("sent_at"),
    sent_resend_id: text("sent_resend_id"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    receivedEmailIdIdx: index("idx_reply_drafts_received_email_id").on(table.received_email_id),
    contactIdIdx: index("idx_reply_drafts_contact_id").on(table.contact_id),
    statusIdx: index("idx_reply_drafts_status").on(table.status),
  }),
);

export type ReplyDraft = typeof replyDrafts.$inferSelect;
export type NewReplyDraft = typeof replyDrafts.$inferInsert;

export const replyDraftsRelations = relations(replyDrafts, ({ one }) => ({
  receivedEmail: one(receivedEmails, {
    fields: [replyDrafts.received_email_id],
    references: [receivedEmails.id],
  }),
  contact: one(contacts, {
    fields: [replyDrafts.contact_id],
    references: [contacts.id],
  }),
}));

// Messages (LinkedIn DMs, other non-email touchpoints)
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    channel: text("channel").notNull(), // "linkedin" | "telegram" | "whatsapp" | "other"
    direction: text("direction").notNull(), // "inbound" | "outbound"
    contact_id: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    company_id: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    // Link to outbound email that triggered this conversation
    contact_email_id: integer("contact_email_id").references(() => contactEmails.id, { onDelete: "set null" }),
    sender_name: text("sender_name"),
    sender_profile_url: text("sender_profile_url"),
    content: text("content"),
    subject: text("subject"), // optional — thread topic or first line
    sent_at: text("sent_at").notNull(),
    // Classification (same enum as received_emails)
    classification: text("classification"), // interested | not_interested | auto_reply | info_request
    classification_confidence: real("classification_confidence"),
    raw_data: text("raw_data"), // JSON blob for extra metadata
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    contactIdIdx: index("idx_messages_contact_id").on(table.contact_id),
    companyIdIdx: index("idx_messages_company_id").on(table.company_id),
    contactEmailIdIdx: index("idx_messages_contact_email_id").on(table.contact_email_id),
    channelIdx: index("idx_messages_channel").on(table.channel),
    directionIdx: index("idx_messages_direction").on(table.direction),
    sentAtIdx: index("idx_messages_sent_at").on(table.sent_at),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export const messagesRelations = relations(messages, ({ one }) => ({
  contact: one(contacts, {
    fields: [messages.contact_id],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [messages.company_id],
    references: [companies.id],
  }),
  contactEmail: one(contactEmails, {
    fields: [messages.contact_email_id],
    references: [contactEmails.id],
  }),
}));

// ── Crawl Logs (persisted BFS crawl traces from Chrome extension) ──

export const crawlLogs = pgTable("crawl_logs", {
  id: serial("id").primaryKey(),
  seed_url: text("seed_url").notNull(),
  company_slug: text("company_slug").notNull(),
  status: text("status", {
    enum: ["running", "completed", "cancelled", "error"],
  }).notNull().default("running"),
  saved: integer("saved").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  filtered: integer("filtered").notNull().default(0),
  targets: integer("targets").notNull().default(0),
  visited: integer("visited").notNull().default(0),
  total_remote_jobs: integer("total_remote_jobs").notNull().default(0),
  duration_ms: integer("duration_ms").notNull().default(0),
  entries: text("entries"),             // JSON stringified string[]
  error: text("error"),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  created_at: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}, (table) => [
  index("idx_crawl_logs_seed_url").on(table.seed_url),
  index("idx_crawl_logs_started_at").on(table.started_at),
  index("idx_crawl_logs_status").on(table.status),
]);

export type CrawlLog = typeof crawlLogs.$inferSelect;
export type NewCrawlLog = typeof crawlLogs.$inferInsert;

// ── Webhook Events (Resend webhook event log) ──

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  event_type: text("event_type").notNull(),
  email_id: text("email_id"),
  from_email: text("from_email"),
  to_emails: text("to_emails"),
  subject: text("subject"),
  payload: text("payload"),
  http_status: integer("http_status"),
  error: text("error"),
  created_at: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}, (table) => [
  index("idx_webhook_events_event_type").on(table.event_type),
  index("idx_webhook_events_email_id").on(table.email_id),
  index("idx_webhook_events_created_at").on(table.created_at),
]);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

// ── Products ──

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    domain: text("domain"),
    description: text("description"),
    highlights: jsonb("highlights"),
    icp_analysis: jsonb("icp_analysis"),
    icp_analyzed_at: text("icp_analyzed_at"),
    pricing_analysis: jsonb("pricing_analysis"),
    pricing_analyzed_at: text("pricing_analyzed_at"),
    gtm_analysis: jsonb("gtm_analysis"),
    gtm_analyzed_at: text("gtm_analyzed_at"),
    intel_report: jsonb("intel_report"),
    intel_report_at: text("intel_report_at"),
    // Positioning statement — written by backend/leadgen_agent/positioning_graph.py
    // (migration 0064). Full PositioningStatement payload; no separate timestamp
    // because updated_at bumps on write and graph_meta.run_at carries the precise
    // completion time.
    positioning_analysis: jsonb("positioning_analysis"),
    // ICP semantic embedding (see migration 0073). 1024-dim BGE-M3 vector
    // derived from icp_analysis. Used for HNSW cosine lookups against
    // companies.profile_embedding in semantic ICP scoring.
    icp_embedding: vector("icp_embedding", { dimensions: 1024 }),
    icp_embedding_model: text("icp_embedding_model"),
    icp_embedding_source_hash: text("icp_embedding_source_hash"),
    icp_embedding_updated_at: text("icp_embedding_updated_at"),
    // Freshness snapshot — written by the `freshness` LangGraph endpoint
    // (see migrations/0065_add_freshness_tracking.sql + backend/leadgen_agent/
    // freshness_graph.py). Used by the product_intel supervisor to decide
    // whether cached icp_analysis / competitors still reflect reality.
    freshness_snapshot: jsonb("freshness_snapshot"),
    // Publish gate (see migrations/0060_add_product_published_at.sql). Rows with
    // published_at IS NULL are admin-only drafts; non-admin reads must filter.
    published_at: timestamp("published_at", { withTimezone: true }),
    // Generated column (see migrations/0059_public_intel_reads.sql) — mirrors
    // slugify(name) at the DB level, indexed for fast productBySlug.
    slug: text("slug").generatedAlwaysAs(
      sql`lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))`,
    ),
    created_by: text("created_by"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    uniqueIndex("idx_products_tenant_url").on(table.tenant_id, table.url),
    index("idx_products_tenant_id").on(table.tenant_id),
    uniqueIndex("idx_products_slug").on(table.slug),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// Per-(contact, product) persona match cache (see migration 0071).
// Populated by the match_persona node in email_outreach_graph before draft.
export const contactPersonaScores = pgTable(
  "contact_persona_scores",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    contact_id: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    product_id: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    persona_title: text("persona_title").notNull(),
    score: real("score").notNull(),
    method: text("method").notNull(), // "title_fuzzy" | "embedding" | "title_exact"
    rationale: text("rationale"),
    scored_at: text("scored_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (t) => ({
    contactProductUnique: uniqueIndex("idx_contact_persona_unique").on(
      t.contact_id,
      t.product_id,
      t.persona_title,
    ),
    productScoreIdx: index("idx_cps_product_score").on(t.product_id, t.score),
  }),
);

export type ContactPersonaScore = typeof contactPersonaScores.$inferSelect;
export type NewContactPersonaScore = typeof contactPersonaScores.$inferInsert;

// Denormalized per-(company, product) lead-gen signals (see migration 0067).
// One row per pairing — latest snapshot of regex / heuristic / LLM signals
// plus an aggregate `score` and `tier`. Provenance stays in `company_facts`.
// Populated by the generic `score_verticals` node in company_enrichment_graph.
// Queried for hot-lead lists via (product_id, tier, score DESC).
export const companyProductSignals = pgTable(
  "company_product_signals",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    product_id: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Signals jsonb shape governed by ProductVertical.schema_version in
    // backend/leadgen_agent/verticals/registry.py. Always includes
    // `schema_version`; remaining keys are vertical-specific.
    signals: jsonb("signals").notNull().default(sql`'{}'::jsonb`),
    score: real("score").notNull().default(0),
    // Separated component scores (see migration 0073). `score` stays the
    // blended aggregate used for tiering; these two let us observe the
    // regex-only vs semantic-only contribution without re-running the graph.
    regex_score: real("regex_score").notNull().default(0),
    semantic_score: real("semantic_score"),
    semantic_score_computed_at: timestamp("semantic_score_computed_at", { withTimezone: true }),
    tier: text("tier"), // 'hot' | 'warm' | 'cold' | null
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_company_product_signals_pair").on(
      table.company_id,
      table.product_id,
    ),
    index("idx_company_product_signals_hot").on(
      table.product_id,
      table.tier,
      table.score,
    ),
    index("idx_company_product_signals_tenant").on(
      table.tenant_id,
      table.product_id,
    ),
  ],
);

export type CompanyProductSignals = typeof companyProductSignals.$inferSelect;
export type NewCompanyProductSignals = typeof companyProductSignals.$inferInsert;

// ── Competitor Analysis ──

export const competitorAnalyses = pgTable(
  "competitor_analyses",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    product_id: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending_approval", "scraping", "done", "failed"],
    }).notNull().default("pending_approval"),
    created_by: text("created_by"),
    error: text("error"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_competitor_analyses_status").on(table.status),
    index("idx_competitor_analyses_created_at").on(table.created_at),
    index("idx_competitor_analyses_product_id").on(table.product_id),
  ],
);

export type CompetitorAnalysis = typeof competitorAnalyses.$inferSelect;
export type NewCompetitorAnalysis = typeof competitorAnalyses.$inferInsert;

export const competitors = pgTable(
  "competitors",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    analysis_id: integer("analysis_id")
      .notNull()
      .references(() => competitorAnalyses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    domain: text("domain"),
    logo_url: text("logo_url"),
    description: text("description"),
    positioning_headline: text("positioning_headline"),
    positioning_tagline: text("positioning_tagline"),
    target_audience: text("target_audience"),
    status: text("status", {
      enum: ["suggested", "approved", "scraping", "done", "failed"],
    }).notNull().default("suggested"),
    scraped_at: text("scraped_at"),
    scrape_error: text("scrape_error"),
    // SHA-256 of the last normalized scraped markdown for this competitor's
    // URL. See migrations/0065_add_freshness_tracking.sql. When the next
    // freshness run produces a different hash, the competitor has moved —
    // drives "competitor moved" alerts.
    last_url_hash: text("last_url_hash"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_competitors_analysis_id").on(table.analysis_id),
    index("idx_competitors_status").on(table.status),
    index("idx_competitors_last_url_hash").on(table.last_url_hash),
  ],
);

export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;

export const competitorPricingTiers = pgTable(
  "competitor_pricing_tiers",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    competitor_id: integer("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    tier_name: text("tier_name").notNull(),
    monthly_price_usd: real("monthly_price_usd"),
    annual_price_usd: real("annual_price_usd"),
    seat_price_usd: real("seat_price_usd"),
    currency: text("currency").notNull().default("USD"),
    included_limits: jsonb("included_limits"),
    is_custom_quote: boolean("is_custom_quote").notNull().default(false),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_competitor_pricing_tiers_competitor_id").on(table.competitor_id),
  ],
);

export type CompetitorPricingTier = typeof competitorPricingTiers.$inferSelect;
export type NewCompetitorPricingTier = typeof competitorPricingTiers.$inferInsert;

export const competitorFeatures = pgTable(
  "competitor_features",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    competitor_id: integer("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    tier_name: text("tier_name"),
    feature_text: text("feature_text").notNull(),
    category: text("category"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_competitor_features_competitor_id").on(table.competitor_id),
    index("idx_competitor_features_category").on(table.category),
  ],
);

export type CompetitorFeature = typeof competitorFeatures.$inferSelect;
export type NewCompetitorFeature = typeof competitorFeatures.$inferInsert;

export const competitorIntegrations = pgTable(
  "competitor_integrations",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    competitor_id: integer("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    integration_name: text("integration_name").notNull(),
    integration_url: text("integration_url"),
    category: text("category"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_competitor_integrations_competitor_id").on(table.competitor_id),
  ],
);

export type CompetitorIntegration = typeof competitorIntegrations.$inferSelect;
export type NewCompetitorIntegration = typeof competitorIntegrations.$inferInsert;

// ── Product Intel Runs (async LangGraph run tracking) ──

export const productIntelRuns = pgTable(
  "product_intel_runs",
  {
    id: text("id").primaryKey(), // UUID generated in startGraphRun
    lg_run_id: text("lg_run_id"),
    lg_thread_id: text("lg_thread_id"),
    product_id: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tenant_id: tenantIdColumn(),
    kind: text("kind", {
      enum: ["pricing", "gtm", "product_intel", "icp"],
    }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "success", "error", "timeout"],
    }).notNull().default("queued"),
    webhook_secret: text("webhook_secret").notNull(),
    started_at: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finished_at: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    output: jsonb("output"),
    created_by: text("created_by"),
    // Streaming per-stage progress snapshot written by graph nodes. See
    // migration 0063 and backend/leadgen_agent/notify.py::update_progress.
    progress: jsonb("progress"),
    // Run-level cost telemetry aggregated from graph_meta.telemetry. See
    // migration 0066 and backend/leadgen_agent/llm.py::compute_totals.
    // Stored as numeric; drizzle returns it as string — parseFloat at the
    // resolver boundary when you need a number.
    total_cost_usd: numeric("total_cost_usd", { precision: 10, scale: 6 }),
    // Stamped from PRODUCT_INTEL_VERSION at write time so old-schema outputs
    // can be filtered/invalidated later without backfill. Source of truth is
    // backend/leadgen_agent/product_intel_schemas.py; mirrored in
    // src/lib/intelVersion.ts (parity enforced by a test).
    schema_version: text("schema_version"),
  },
  (table) => [
    index("idx_intel_runs_product_id").on(table.product_id),
    index("idx_intel_runs_status").on(table.status),
    index("idx_intel_runs_tenant").on(table.tenant_id),
    index("idx_intel_runs_started").on(table.started_at.desc()),
  ],
);

export type ProductIntelRun = typeof productIntelRuns.$inferSelect;
export type NewProductIntelRun = typeof productIntelRuns.$inferInsert;

// Sibling table for per-run HMAC webhook secrets. Kept out of
// product_intel_runs so the public_read RLS policy (migration 0059) cannot
// leak the secret via SELECT *. RLS is enabled + forced with zero policies
// (see migration 0061) so only the owning role reads it.
export const productIntelRunSecrets = pgTable("product_intel_run_secrets", {
  run_id: text("run_id")
    .primaryKey()
    .references(() => productIntelRuns.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProductIntelRunSecret = typeof productIntelRunSecrets.$inferSelect;
export type NewProductIntelRunSecret = typeof productIntelRunSecrets.$inferInsert;

export const productsRelations = relations(products, ({ many }) => ({
  analyses: many(competitorAnalyses),
  intelRuns: many(productIntelRuns),
}));

export const productIntelRunsRelations = relations(productIntelRuns, ({ one }) => ({
  product: one(products, {
    fields: [productIntelRuns.product_id],
    references: [products.id],
  }),
  secret: one(productIntelRunSecrets, {
    fields: [productIntelRuns.id],
    references: [productIntelRunSecrets.run_id],
  }),
}));

export const productIntelRunSecretsRelations = relations(
  productIntelRunSecrets,
  ({ one }) => ({
    run: one(productIntelRuns, {
      fields: [productIntelRunSecrets.run_id],
      references: [productIntelRuns.id],
    }),
  }),
);

export const competitorAnalysesRelations = relations(competitorAnalyses, ({ one, many }) => ({
  product: one(products, {
    fields: [competitorAnalyses.product_id],
    references: [products.id],
  }),
  competitors: many(competitors),
}));

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  analysis: one(competitorAnalyses, {
    fields: [competitors.analysis_id],
    references: [competitorAnalyses.id],
  }),
  pricingTiers: many(competitorPricingTiers),
  features: many(competitorFeatures),
  integrations: many(competitorIntegrations),
}));

export const competitorPricingTiersRelations = relations(competitorPricingTiers, ({ one }) => ({
  competitor: one(competitors, {
    fields: [competitorPricingTiers.competitor_id],
    references: [competitors.id],
  }),
}));

export const competitorFeaturesRelations = relations(competitorFeatures, ({ one }) => ({
  competitor: one(competitors, {
    fields: [competitorFeatures.competitor_id],
    references: [competitors.id],
  }),
}));

export const competitorIntegrationsRelations = relations(competitorIntegrations, ({ one }) => ({
  competitor: one(competitors, {
    fields: [competitorIntegrations.competitor_id],
    references: [competitors.id],
  }),
}));
