/**
 * Contact, ContactEmail, and CompanyContactEmail field resolvers.
 *
 * These handle camelCase mapping, JSON parsing, and computed fields
 * for the Contact, ContactEmail, and CompanyContactEmail GraphQL types.
 */

import type {
  Contact as DbContact,
  ContactEmail as DbContactEmail,
  Company as DbCompany,
} from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { parseJsonArray } from "./classification";

// Joined row type returned by companyContactEmails query
type DbCompanyContactEmailRow = DbContactEmail & {
  contact_first_name: string;
  contact_last_name: string;
  contact_position: string | null;
};

export const Contact = {
  emails(parent: DbContact) {
    return parseJsonArray(parent.emails);
  },
  bouncedEmails(parent: DbContact) {
    return parseJsonArray(parent.bounced_emails);
  },
  nbFlags(parent: DbContact) {
    return parseJsonArray(parent.nb_flags);
  },
  tags(parent: DbContact) {
    return parseJsonArray(parent.tags);
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
    return (parent.email_verified as unknown) === 1 || parent.email_verified === true;
  },
  doNotContact(parent: DbContact) {
    return (parent.do_not_contact as unknown) === 1 || parent.do_not_contact === true;
  },
  githubHandle(parent: DbContact) {
    return parent.github_handle ?? null;
  },
  telegramHandle(parent: DbContact) {
    return parent.telegram_handle ?? null;
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
    return (parent.is_decision_maker as unknown) === true ||
           (parent.is_decision_maker as unknown) === 1;
  },
  authorityScore(parent: DbContact) {
    return parent.authority_score ?? 0.0;
  },
  dmReasons(parent: DbContact) {
    return parseJsonArray(parent.dm_reasons);
  },
  nextTouchScore(parent: DbContact) {
    return parent.next_touch_score ?? 0.0;
  },
  lastContactedAt(parent: DbContact) {
    return parent.last_contacted_at ?? null;
  },
  aiProfile(parent: DbContact) {
    if (!parent.ai_profile) return null;
    try {
      const raw = JSON.parse(parent.ai_profile);
      return {
        trigger: raw.trigger,
        enrichedAt: raw.enriched_at,
        linkedinHeadline: raw.linkedin_headline ?? null,
        linkedinBio: raw.linkedin_bio ?? null,
        githubBio: raw.github_bio ?? null,
        githubTopLanguages: raw.github_top_languages ?? [],
        githubAiRepos: (raw.github_ai_repos ?? []).map((r: any) => ({
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
      };
    } catch {
      return null;
    }
  },
  toBeDeleted(parent: DbContact) {
    return (parent.to_be_deleted as unknown) === true || (parent.to_be_deleted as unknown) === 1;
  },
  deletionScore(parent: DbContact) {
    return parent.deletion_score ?? null;
  },
  deletionReasons(parent: DbContact) {
    return parseJsonArray(parent.deletion_reasons);
  },
  deletionFlaggedAt(parent: DbContact) {
    return parent.deletion_flagged_at ?? null;
  },
  authenticityVerdict(parent: DbContact) {
    return parent.authenticity_verdict ?? null;
  },
  authenticityScore(parent: DbContact) {
    return parent.authenticity_score ?? null;
  },
  authenticityFlags(parent: DbContact) {
    return parseJsonArray(parent.authenticity_flags);
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
  toEmails: (parent: DbContactEmail) => parseJsonArray(parent.to_emails),
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
  replyReceived: (parent: DbContactEmail) =>
    (parent.reply_received as unknown) === 1 || parent.reply_received === true,
  replyReceivedAt: (parent: DbContactEmail) => parent.reply_received_at ?? null,
  followupStatus: (parent: DbContactEmail) => parent.followup_status ?? null,
  companyId: (parent: DbContactEmail) => parent.company_id ?? null,
  ccEmails: (parent: DbContactEmail) => parseJsonArray(parent.cc_emails),
  replyToEmails: (parent: DbContactEmail) => parseJsonArray(parent.reply_to_emails),
  htmlContent: (parent: DbContactEmail) => parent.html_content ?? null,
  attachments: (parent: DbContactEmail) => parent.attachments ? JSON.parse(parent.attachments) : [],
  tags: (parent: DbContactEmail) => parseJsonArray(parent.tags),
  headers: (parent: DbContactEmail) => parent.headers ? JSON.parse(parent.headers) : [],
  idempotencyKey: (parent: DbContactEmail) => parent.idempotency_key ?? null,
  createdAt: (parent: DbContactEmail) => parent.created_at,
  updatedAt: (parent: DbContactEmail) => parent.updated_at,
};

export const CompanyContactEmailField = {
  contactId: (parent: DbCompanyContactEmailRow) => parent.contact_id,
  resendId: (parent: DbCompanyContactEmailRow) => parent.resend_id,
  fromEmail: (parent: DbCompanyContactEmailRow) => parent.from_email,
  toEmails: (parent: DbCompanyContactEmailRow) => parseJsonArray(parent.to_emails),
  textContent: (parent: DbCompanyContactEmailRow) => parent.text_content ?? null,
  sentAt: (parent: DbCompanyContactEmailRow) => parent.sent_at ?? null,
  scheduledAt: (parent: DbCompanyContactEmailRow) => parent.scheduled_at ?? null,
  deliveredAt: (parent: DbCompanyContactEmailRow) => parent.delivered_at ?? null,
  openedAt: (parent: DbCompanyContactEmailRow) => parent.opened_at ?? null,
  recipientName: (parent: DbCompanyContactEmailRow) => parent.recipient_name ?? null,
  errorMessage: (parent: DbCompanyContactEmailRow) => parent.error_message ?? null,
  sequenceType: (parent: DbCompanyContactEmailRow) => parent.sequence_type ?? null,
  sequenceNumber: (parent: DbCompanyContactEmailRow) => parent.sequence_number ?? null,
  replyReceived: (parent: DbCompanyContactEmailRow) =>
    (parent.reply_received as unknown) === 1 || parent.reply_received === true,
  followupStatus: (parent: DbCompanyContactEmailRow) => parent.followup_status ?? null,
  createdAt: (parent: DbCompanyContactEmailRow) => parent.created_at,
  updatedAt: (parent: DbCompanyContactEmailRow) => parent.updated_at,
  contactFirstName: (parent: DbCompanyContactEmailRow) => parent.contact_first_name,
  contactLastName: (parent: DbCompanyContactEmailRow) => parent.contact_last_name,
  contactPosition: (parent: DbCompanyContactEmailRow) => parent.contact_position ?? null,
};
