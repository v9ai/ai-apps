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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tenantIdColumn = () =>
  text("tenant_id")
    .notNull()
    .default(sql`COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim')`);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  tenant_id: tenantIdColumn(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  logo_url: text("logo_url"),
  website: text("website"),
  description: text("description"),
  industry: text("industry"),
  size: text("size"),
  location: text("location"),

  canonical_domain: text("canonical_domain"),
  category: text("category", {
    enum: [
      "CONSULTANCY",
      "STAFFING",
      "AGENCY",
      "PRODUCT",
      "UNKNOWN",
    ],
  })
    .notNull()
    .default("UNKNOWN"),
  tags: text("tags"),
  services: text("services"),
  service_taxonomy: text("service_taxonomy"),
  industries: text("industries"),

  linkedin_url: text("linkedin_url"),
  job_board_url: text("job_board_url"),

  score: real("score").notNull().default(0.5),
  score_reasons: text("score_reasons"),

  ai_tier: integer("ai_tier").notNull().default(0),
  ai_classification_reason: text("ai_classification_reason"),
  ai_classification_confidence: real("ai_classification_confidence").default(0.5),

  blocked: boolean("blocked").notNull().default(false),

  deep_analysis: text("deep_analysis"),

  email: text("email"),
  emails: text("emails"),
  github_url: text("github_url"),

  github_org: text("github_org"),
  github_ai_score: real("github_ai_score"),
  github_hiring_score: real("github_hiring_score"),
  github_activity_score: real("github_activity_score"),
  github_patterns: text("github_patterns"),
  github_analyzed_at: text("github_analyzed_at"),

  hf_org_name: text("hf_org_name"),
  hf_presence_score: real("hf_presence_score").default(0),

  intent_score: real("intent_score").notNull().default(0),
  intent_score_updated_at: text("intent_score_updated_at"),
  intent_signals_count: integer("intent_signals_count").notNull().default(0),
  intent_top_signal: text("intent_top_signal"),

  last_seen_crawl_id: text("last_seen_crawl_id"),
  last_seen_capture_timestamp: text("last_seen_capture_timestamp"),
  last_seen_source_url: text("last_seen_source_url"),

  embedding: vector("embedding", { dimensions: 384 }),
  // Canonical ICP-matching embedding (see migration 0073). 1024-dim, BGE-M3 via
  // `crates/icp-embed`. Kept alongside the legacy 384-dim `embedding` so
  // existing consumers keep working while semantic ICP scoring migrates over.
  profile_embedding: vector("profile_embedding", { dimensions: 1024 }),
  profile_embedding_model: text("profile_embedding_model"),
  profile_embedding_source_hash: text("profile_embedding_source_hash"),
  profile_embedding_updated_at: text("profile_embedding_updated_at"),
  rank_score: real("rank_score").default(0),
  rank_score_version: text("rank_score_version"),
  anomaly_score: real("anomaly_score"),
  graph_embedding: text("graph_embedding"),

  created_at: text("created_at")
    .notNull()
    .default(sql`now()::text`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`now()::text`),
}, (table) => ({
  createdAtIdx: index("idx_companies_created_at").on(table.created_at),
  updatedAtIdx: index("idx_companies_updated_at").on(table.updated_at),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export const companyFacts = pgTable(
  "company_facts",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    value_json: text("value_json"),
    value_text: text("value_text"),
    normalized_value: text("normalized_value"),
    confidence: real("confidence").notNull(),

    source_type: text("source_type", {
      enum: ["COMMONCRAWL", "LIVE_FETCH", "MANUAL", "PARTNER", "BRAVE_SEARCH"],
    }).notNull(),
    source_url: text("source_url").notNull(),
    crawl_id: text("crawl_id"),
    capture_timestamp: text("capture_timestamp"),
    observed_at: text("observed_at").notNull(),
    method: text("method", {
      enum: ["JSONLD", "META", "DOM", "HEURISTIC", "LLM"],
    }).notNull(),
    extractor_version: text("extractor_version"),
    http_status: integer("http_status"),
    mime: text("mime"),
    content_hash: text("content_hash"),

    warc_filename: text("warc_filename"),
    warc_offset: integer("warc_offset"),
    warc_length: integer("warc_length"),
    warc_digest: text("warc_digest"),

    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => [
    index("idx_company_facts_company_field").on(table.company_id, table.field),
  ],
);

export type CompanyFact = typeof companyFacts.$inferSelect;
export type NewCompanyFact = typeof companyFacts.$inferInsert;

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    slug: text("slug"),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    linkedin_url: text("linkedin_url"),
    email: text("email"),
    emails: text("emails"),
    company: text("company"),
    company_id: integer("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    position: text("position"),
    user_id: text("user_id"),
    nb_status: text("nb_status"),
    nb_result: text("nb_result"),
    nb_flags: text("nb_flags"),
    nb_suggested_correction: text("nb_suggested_correction"),
    nb_retry_token: text("nb_retry_token"),
    nb_execution_time_ms: integer("nb_execution_time_ms"),
    email_verified: boolean("email_verified").default(false),
    bounced_emails: text("bounced_emails"),
    github_handle: text("github_handle"),
    telegram_handle: text("telegram_handle"),
    do_not_contact: boolean("do_not_contact").default(false),
    tags: text("tags"),
    forwarding_alias: text("forwarding_alias"),
    forwarding_alias_rule_id: text("forwarding_alias_rule_id"),
    seniority: text("seniority"),
    department: text("department"),
    is_decision_maker: boolean("is_decision_maker").default(false),
    authority_score: real("authority_score").default(0.0),
    dm_reasons: text("dm_reasons"),
    next_touch_score: real("next_touch_score").default(0.0),
    last_contacted_at: text("last_contacted_at"),
    ai_profile: text("ai_profile"),
    to_be_deleted: boolean("to_be_deleted").notNull().default(false),
    deletion_score: real("deletion_score"),
    deletion_reasons: text("deletion_reasons"),
    deletion_flagged_at: text("deletion_flagged_at"),
    lora_tier: text("lora_tier"),
    lora_reasons: jsonb("lora_reasons"),
    lora_scored_at: text("lora_scored_at"),
    papers: jsonb("papers"), // Append-only multi-pipeline array; merge by doi || (source, source_id) || title. Never overwrite.
    papers_enriched_at: text("papers_enriched_at"),
    paper_classifications: jsonb("paper_classifications"),
    paper_classifications_at: text("paper_classifications_at"),
    gh_match_score: real("gh_match_score"),
    gh_match_status: text("gh_match_status"),
    gh_match_arm: text("gh_match_arm"),
    gh_match_evidence_ref: text("gh_match_evidence_ref"),
    linkedin_profile: jsonb("linkedin_profile"),
    openalex_profile: jsonb("openalex_profile"),
    // ── Paper-author enrichment fan-out branches ─────────────────────────
    // Populated by contact_enrich_paper_author_graph in the lead-gen backend.
    // All nullable; presence indicates the corresponding enricher ran.
    orcid_profile: jsonb("orcid_profile"),
    scholar_profile: jsonb("scholar_profile"),
    github_profile: jsonb("github_profile"),
    homepage_url: text("homepage_url"),
    homepage_extract: jsonb("homepage_extract"),
    email_candidates: jsonb("email_candidates"),
    enrich_status: jsonb("enrich_status"),
    conversation_stage: text("conversation_stage"),
    authenticity_score: real("authenticity_score"),
    authenticity_verdict: text("authenticity_verdict"),
    authenticity_flags: text("authenticity_flags"),
    verified_at: text("verified_at"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .default(sql`now()::text`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`now()::text`),
  },
  (table) => ({
    slugIdx: uniqueIndex("idx_contacts_slug").on(table.slug),
    emailIdx: uniqueIndex("idx_contacts_email").on(table.email),
    companyIdIdx: index("idx_contacts_company_id").on(table.company_id),
    linkedinUrlIdx: index("idx_contacts_linkedin_url").on(table.linkedin_url),
    githubHandleIdx: uniqueIndex("idx_contacts_github_handle")
      .on(table.github_handle)
      .where(sql`github_handle IS NOT NULL`),
    loraTierIdx: index("idx_contacts_lora_tier")
      .on(table.lora_tier)
      .where(sql`lora_tier IS NOT NULL`),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
