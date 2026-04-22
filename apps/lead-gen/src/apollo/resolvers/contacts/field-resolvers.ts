/**
 * Contact, ContactEmail, and CompanyContactEmail field resolvers.
 *
 * These handle camelCase mapping, JSON parsing, and computed fields
 * for the Contact, ContactEmail, and CompanyContactEmail GraphQL types.
 *
 * JSON fields are memoized per parent object via a WeakMap so that
 * multiple field resolvers accessing the same row never re-parse.
 */

import type {
  Contact as DbContact,
  ContactEmail as DbContactEmail,
  Company as DbCompany,
  Message as DbMessage,
} from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { parseJsonArray } from "./classification";

// ── Per-object JSON parse cache (WeakMap → auto-GC, zero leak) ──────
const jsonCache = new WeakMap<object, Map<string, unknown>>();

function cachedParseArray(parent: object, key: string, raw: string | null | undefined): string[] {
  if (!raw) return [];
  let cache = jsonCache.get(parent);
  if (!cache) { cache = new Map(); jsonCache.set(parent, cache); }
  if (cache.has(key)) return cache.get(key) as string[];
  const parsed = parseJsonArray(raw);
  cache.set(key, parsed);
  return parsed;
}

function cachedParse<T>(parent: object, key: string, raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  let cache = jsonCache.get(parent);
  if (!cache) { cache = new Map(); jsonCache.set(parent, cache); }
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const parsed = JSON.parse(raw) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

// Joined row type returned by companyContactEmails query
type DbCompanyContactEmailRow = DbContactEmail & {
  contact_first_name: string;
  contact_last_name: string;
  contact_position: string | null;
};

export const Contact = {
  slug(parent: DbContact) {
    return parent.slug ?? null;
  },
  emails(parent: DbContact) {
    return cachedParseArray(parent, "emails", parent.emails);
  },
  bouncedEmails(parent: DbContact) {
    return cachedParseArray(parent, "bounced_emails", parent.bounced_emails);
  },
  nbFlags(parent: DbContact) {
    return cachedParseArray(parent, "nb_flags", parent.nb_flags);
  },
  tags(parent: DbContact) {
    return cachedParseArray(parent, "tags", parent.tags);
  },
  firstName(parent: DbContact) {
    return parent.first_name;
  },
  lastName(parent: DbContact) {
    return parent.last_name;
  },
  linkedinUrl(parent: DbContact) {
    return parent.linkedin_url ?? null;
  },
  companyId(parent: DbContact) {
    return parent.company_id ?? null;
  },
  userId(parent: DbContact) {
    return parent.user_id ?? null;
  },
  nbStatus(parent: DbContact) {
    return parent.nb_status ?? null;
  },
  nbResult(parent: DbContact) {
    return parent.nb_result ?? null;
  },
  nbSuggestedCorrection(parent: DbContact) {
    return parent.nb_suggested_correction ?? null;
  },
  nbRetryToken(parent: DbContact) {
    return parent.nb_retry_token ?? null;
  },
  nbExecutionTimeMs(parent: DbContact) {
    return parent.nb_execution_time_ms ?? null;
  },
  emailVerified(parent: DbContact) {
    return parent.email_verified ?? false;
  },
  doNotContact(parent: DbContact) {
    return parent.do_not_contact ?? false;
  },
  githubHandle(parent: DbContact) {
    return parent.github_handle ?? null;
  },
  telegramHandle(parent: DbContact) {
    return parent.telegram_handle ?? null;
  },
  forwardingAlias(parent: DbContact) {
    return parent.forwarding_alias ?? null;
  },
  forwardingAliasRuleId(parent: DbContact) {
    return parent.forwarding_alias_rule_id ?? null;
  },
  createdAt(parent: DbContact) {
    return parent.created_at;
  },
  updatedAt(parent: DbContact) {
    return parent.updated_at;
  },
  // ML-derived decision-maker fields
  seniority(parent: DbContact) {
    return parent.seniority ?? null;
  },
  department(parent: DbContact) {
    return parent.department ?? null;
  },
  isDecisionMaker(parent: DbContact) {
    return parent.is_decision_maker ?? false;
  },
  authorityScore(parent: DbContact) {
    return parent.authority_score ?? 0.0;
  },
  dmReasons(parent: DbContact) {
    return cachedParseArray(parent, "dm_reasons", parent.dm_reasons);
  },
  nextTouchScore(parent: DbContact) {
    return parent.next_touch_score ?? 0.0;
  },
  lastContactedAt(parent: DbContact) {
    return parent.last_contacted_at ?? null;
  },
  aiProfile(parent: DbContact) {
    if (!parent.ai_profile) return null;
    const raw = cachedParse<Record<string, unknown>>(parent, "ai_profile", parent.ai_profile, null as unknown as Record<string, unknown>);
    if (!raw) return null;
    return {
      trigger: raw.trigger,
      enrichedAt: raw.enriched_at,
      linkedinHeadline: raw.linkedin_headline ?? null,
      linkedinBio: raw.linkedin_bio ?? null,
      githubBio: raw.github_bio ?? null,
      githubTopLanguages: (raw.github_top_languages as string[]) ?? [],
      githubAiRepos: ((raw.github_ai_repos as any[]) ?? []).map((r: any) => ({
        name: r.name,
        description: r.description ?? null,
        stars: r.stars,
        topics: r.topics ?? [],
      })),
      githubTotalStars: raw.github_total_stars ?? 0,
      specialization: raw.specialization ?? null,
      skills: raw.skills ?? [],
      researchAreas: raw.research_areas ?? [],
      experienceLevel: raw.experience_level ?? "unknown",
      synthesisConfidence: raw.synthesis_confidence ?? 0,
      synthesisRationale: raw.synthesis_rationale ?? null,
      workExperience: ((raw.work_experience as any[]) ?? []).map((w: any) => ({
        company: w.company,
        companyLogo: w.company_logo ?? null,
        title: w.title,
        employmentType: w.employment_type ?? null,
        startDate: w.start_date,
        endDate: w.end_date ?? null,
        duration: w.duration ?? null,
        location: w.location ?? null,
        description: w.description ?? null,
        skills: w.skills ?? [],
      })),
    };
  },
  toBeDeleted(parent: DbContact) {
    return parent.to_be_deleted ?? false;
  },
  deletionScore(parent: DbContact) {
    return parent.deletion_score ?? null;
  },
  deletionReasons(parent: DbContact) {
    return cachedParseArray(parent, "deletion_reasons", parent.deletion_reasons);
  },
  deletionFlaggedAt(parent: DbContact) {
    return parent.deletion_flagged_at ?? null;
  },
  loraTier(parent: DbContact) {
    return parent.lora_tier ?? null;
  },
  loraReasons(parent: DbContact) {
    const raw = parent.lora_reasons;
    if (Array.isArray(raw)) return raw.filter((r): r is string => typeof r === "string");
    if (typeof raw === "string") return cachedParseArray(parent, "lora_reasons", raw);
    return [];
  },
  loraScoredAt(parent: DbContact) {
    return parent.lora_scored_at ?? null;
  },
  papers(parent: DbContact) {
    // papers is a jsonb column; Drizzle auto-parses it to an array of objects.
    const raw = parent.papers;
    if (!Array.isArray(raw)) return [];
    type PaperRow = {
      title?: unknown;
      authors?: unknown;
      year?: unknown;
      venue?: unknown;
      doi?: unknown;
      url?: unknown;
      citation_count?: unknown;
      source?: unknown;
    };
    return raw
      .filter((p): p is PaperRow => typeof p === "object" && p !== null)
      .map((p) => ({
        title: typeof p.title === "string" ? p.title : "",
        authors: Array.isArray(p.authors)
          ? p.authors.filter((a): a is string => typeof a === "string")
          : [],
        year: typeof p.year === "number" ? p.year : null,
        venue: typeof p.venue === "string" ? p.venue : null,
        doi: typeof p.doi === "string" ? p.doi : null,
        url: typeof p.url === "string" ? p.url : null,
        citationCount: typeof p.citation_count === "number" ? p.citation_count : null,
        source: typeof p.source === "string" ? p.source : null,
      }));
  },
  papersEnrichedAt(parent: DbContact) {
    return parent.papers_enriched_at ?? null;
  },
  authenticityVerdict(parent: DbContact) {
    return parent.authenticity_verdict ?? null;
  },
  authenticityScore(parent: DbContact) {
    return parent.authenticity_score ?? null;
  },
  authenticityFlags(parent: DbContact) {
    return cachedParseArray(parent, "authenticity_flags", parent.authenticity_flags);
  },
};

// Company.contacts field resolver (defined by contacts module since contacts owns this relationship)
export const CompanyContactsField = {
  async contacts(parent: DbCompany, _args: unknown, context: GraphQLContext) {
    return context.loaders.contactsByCompany.load(parent.id);
  },
};

export const ContactEmailField = {
  contactId: (parent: DbContactEmail) => parent.contact_id,
  resendId: (parent: DbContactEmail) => parent.resend_id,
  fromEmail: (parent: DbContactEmail) => parent.from_email,
  toEmails: (parent: DbContactEmail) => cachedParseArray(parent, "to_emails", parent.to_emails),
  textContent: (parent: DbContactEmail) => parent.text_content ?? null,
  sentAt: (parent: DbContactEmail) => parent.sent_at ?? null,
  scheduledAt: (parent: DbContactEmail) => parent.scheduled_at ?? null,
  deliveredAt: (parent: DbContactEmail) => parent.delivered_at ?? null,
  openedAt: (parent: DbContactEmail) => parent.opened_at ?? null,
  recipientName: (parent: DbContactEmail) => parent.recipient_name ?? null,
  errorMessage: (parent: DbContactEmail) => parent.error_message ?? null,
  parentEmailId: (parent: DbContactEmail) => parent.parent_email_id ?? null,
  sequenceType: (parent: DbContactEmail) => parent.sequence_type ?? null,
  sequenceNumber: (parent: DbContactEmail) => parent.sequence_number ?? null,
  replyReceived: (parent: DbContactEmail) => parent.reply_received ?? false,
  replyReceivedAt: (parent: DbContactEmail) => parent.reply_received_at ?? null,
  followupStatus: (parent: DbContactEmail) => parent.followup_status ?? null,
  companyId: (parent: DbContactEmail) => parent.company_id ?? null,
  ccEmails: (parent: DbContactEmail) => cachedParseArray(parent, "cc_emails", parent.cc_emails),
  replyToEmails: (parent: DbContactEmail) => cachedParseArray(parent, "reply_to_emails", parent.reply_to_emails),
  htmlContent: (parent: DbContactEmail) => parent.html_content ?? null,
  attachments: (parent: DbContactEmail) => cachedParse(parent, "attachments", parent.attachments, []),
  tags: (parent: DbContactEmail) => cachedParseArray(parent, "tags", parent.tags),
  headers: (parent: DbContactEmail) => cachedParse(parent, "headers", parent.headers, []),
  idempotencyKey: (parent: DbContactEmail) => parent.idempotency_key ?? null,
  createdAt: (parent: DbContactEmail) => parent.created_at,
  updatedAt: (parent: DbContactEmail) => parent.updated_at,
};

export const CompanyContactEmailField = {
  contactId: (parent: DbCompanyContactEmailRow) => parent.contact_id,
  resendId: (parent: DbCompanyContactEmailRow) => parent.resend_id,
  fromEmail: (parent: DbCompanyContactEmailRow) => parent.from_email,
  toEmails: (parent: DbCompanyContactEmailRow) => cachedParseArray(parent, "to_emails", parent.to_emails),
  textContent: (parent: DbCompanyContactEmailRow) => parent.text_content ?? null,
  sentAt: (parent: DbCompanyContactEmailRow) => parent.sent_at ?? null,
  scheduledAt: (parent: DbCompanyContactEmailRow) => parent.scheduled_at ?? null,
  deliveredAt: (parent: DbCompanyContactEmailRow) => parent.delivered_at ?? null,
  openedAt: (parent: DbCompanyContactEmailRow) => parent.opened_at ?? null,
  recipientName: (parent: DbCompanyContactEmailRow) => parent.recipient_name ?? null,
  errorMessage: (parent: DbCompanyContactEmailRow) => parent.error_message ?? null,
  sequenceType: (parent: DbCompanyContactEmailRow) => parent.sequence_type ?? null,
  sequenceNumber: (parent: DbCompanyContactEmailRow) => parent.sequence_number ?? null,
  replyReceived: (parent: DbCompanyContactEmailRow) => parent.reply_received ?? false,
  followupStatus: (parent: DbCompanyContactEmailRow) => parent.followup_status ?? null,
  createdAt: (parent: DbCompanyContactEmailRow) => parent.created_at,
  updatedAt: (parent: DbCompanyContactEmailRow) => parent.updated_at,
  contactFirstName: (parent: DbCompanyContactEmailRow) => parent.contact_first_name,
  contactLastName: (parent: DbCompanyContactEmailRow) => parent.contact_last_name,
  contactPosition: (parent: DbCompanyContactEmailRow) => parent.contact_position ?? null,
};

export const ContactMessageField = {
  contactId: (parent: DbMessage) => parent.contact_id ?? null,
  companyId: (parent: DbMessage) => parent.company_id ?? null,
  contactEmailId: (parent: DbMessage) => parent.contact_email_id ?? null,
  senderName: (parent: DbMessage) => parent.sender_name ?? null,
  senderProfileUrl: (parent: DbMessage) => parent.sender_profile_url ?? null,
  sentAt: (parent: DbMessage) => parent.sent_at,
  classificationConfidence: (parent: DbMessage) => parent.classification_confidence ?? null,
  createdAt: (parent: DbMessage) => parent.created_at,
  updatedAt: (parent: DbMessage) => parent.updated_at,
};
