import DataLoader from "dataloader";
import { eq, inArray } from "drizzle-orm";
import type { DbInstance } from "@/db";
import {
  companies,
  companyFacts,
  companySnapshots,
  userSettings,
  contacts,
  contactEmails,
  emailCampaigns,
  linkedinPosts,
  intentSignals,
  receivedEmails,
  opportunities,
} from "@/db/schema";
import type {
  Company,
  CompanyFact,
  CompanySnapshot,
  UserSettings,
  Contact,
  ContactEmail,
  EmailCampaign,
  LinkedInPost,
  IntentSignal,
  ReceivedEmail,
  Opportunity,
} from "@/db/schema";

// ── Batch size tuning per entity access pattern ────────────────────────
// Companies: loaded in bulk (list views, 50-item pages) → large batch
const BATCH_COMPANY = 250;
// Per-company child entities: loaded per-company in field resolvers → medium batch
const BATCH_PER_COMPANY = 100;
// Contacts: loaded per-company or individually → medium batch
const BATCH_CONTACT = 100;
// User settings: typically 1 per request (current user) → small batch
const BATCH_USER = 10;

// ── Batch scheduler ────────────────────────────────────────────────────
// Default DataLoader uses process.nextTick which fires before any I/O.
// A small 2ms delay collects more keys per batch when parallel field
// resolvers are executing, trading negligible latency for fewer DB
// round-trips on list pages (e.g. 50 companies × facts + snapshots).
const batchSchedule = (cb: () => void) => setTimeout(cb, 2);

export function createLoaders(db: DbInstance) {
  return {
    company: new DataLoader<number, Company | null>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companies)
          .where(inArray(companies.id, [...companyIds]));
        const byId = new Map(rows.map((r) => [r.id, r]));
        return companyIds.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: BATCH_COMPANY, batchScheduleFn: batchSchedule },
    ),

    companyFacts: new DataLoader<number, CompanyFact[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companyFacts)
          .where(inArray(companyFacts.company_id, [...companyIds]));
        const byCompany = new Map<number, CompanyFact[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    companySnapshots: new DataLoader<number, CompanySnapshot[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companySnapshots)
          .where(inArray(companySnapshots.company_id, [...companyIds]));
        const byCompany = new Map<number, CompanySnapshot[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    userSettings: new DataLoader<string, UserSettings | null>(
      async (userIds) => {
        const rows = await db
          .select()
          .from(userSettings)
          .where(inArray(userSettings.user_id, [...userIds]));
        const byUser = new Map(rows.map((r) => [r.user_id, r]));
        return userIds.map((id) => byUser.get(id) ?? null);
      },
      // Single-user per request: small batch, no scheduler delay needed,
      // caching disabled to avoid Map overhead for one-shot lookups.
      { maxBatchSize: BATCH_USER, cache: false },
    ),

    contactsByCompany: new DataLoader<number, Contact[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(contacts)
          .where(inArray(contacts.company_id, [...companyIds]));
        const byCompany = new Map<number, Contact[]>();
        for (const row of rows) {
          if (row.company_id == null) continue;
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    contact: new DataLoader<number, Contact | null>(
      async (contactIds) => {
        const rows = await db
          .select()
          .from(contacts)
          .where(inArray(contacts.id, [...contactIds]));
        const byId = new Map(rows.map((r) => [r.id, r]));
        return contactIds.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: BATCH_CONTACT, batchScheduleFn: batchSchedule },
    ),

    contactEmailsByContact: new DataLoader<number, ContactEmail[]>(
      async (contactIds) => {
        const rows = await db
          .select()
          .from(contactEmails)
          .where(inArray(contactEmails.contact_id, [...contactIds]));
        const byContact = new Map<number, ContactEmail[]>();
        for (const row of rows) {
          const arr = byContact.get(row.contact_id);
          if (arr) arr.push(row);
          else byContact.set(row.contact_id, [row]);
        }
        return contactIds.map((id) => byContact.get(id) ?? []);
      },
      { maxBatchSize: BATCH_CONTACT, batchScheduleFn: batchSchedule },
    ),

    emailCampaignsByCompany: new DataLoader<number, EmailCampaign[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(emailCampaigns)
          .where(inArray(emailCampaigns.company_id, [...companyIds]));
        const byCompany = new Map<number, EmailCampaign[]>();
        for (const row of rows) {
          if (row.company_id == null) continue;
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    linkedinPostsByCompany: new DataLoader<number, LinkedInPost[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(linkedinPosts)
          .where(inArray(linkedinPosts.company_id, [...companyIds]));
        const byCompany = new Map<number, LinkedInPost[]>();
        for (const row of rows) {
          if (row.company_id == null) continue;
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    intentSignalsByCompany: new DataLoader<number, IntentSignal[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(intentSignals)
          .where(inArray(intentSignals.company_id, [...companyIds]));
        const byCompany = new Map<number, IntentSignal[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_PER_COMPANY, batchScheduleFn: batchSchedule },
    ),

    receivedEmailsByContact: new DataLoader<number, ReceivedEmail[]>(
      async (contactIds) => {
        const rows = await db
          .select()
          .from(receivedEmails)
          .where(inArray(receivedEmails.matched_contact_id, [...contactIds]));
        const byContact = new Map<number, ReceivedEmail[]>();
        for (const row of rows) {
          if (row.matched_contact_id == null) continue;
          const arr = byContact.get(row.matched_contact_id);
          if (arr) arr.push(row);
          else byContact.set(row.matched_contact_id, [row]);
        }
        return contactIds.map((id) => byContact.get(id) ?? []);
      },
      { maxBatchSize: BATCH_CONTACT, batchScheduleFn: batchSchedule },
    ),

    opportunitiesByContact: new DataLoader<number, (Opportunity & { company_name: string | null })[]>(
      async (contactIds) => {
        const rows = await db
          .select({
            id: opportunities.id,
            title: opportunities.title,
            url: opportunities.url,
            source: opportunities.source,
            status: opportunities.status,
            reward_usd: opportunities.reward_usd,
            reward_text: opportunities.reward_text,
            start_date: opportunities.start_date,
            end_date: opportunities.end_date,
            deadline: opportunities.deadline,
            first_seen: opportunities.first_seen,
            last_seen: opportunities.last_seen,
            score: opportunities.score,
            raw_context: opportunities.raw_context,
            metadata: opportunities.metadata,
            applied: opportunities.applied,
            applied_at: opportunities.applied_at,
            application_status: opportunities.application_status,
            application_notes: opportunities.application_notes,
            tags: opportunities.tags,
            company_id: opportunities.company_id,
            contact_id: opportunities.contact_id,
            created_at: opportunities.created_at,
            updated_at: opportunities.updated_at,
            company_name: companies.name,
          })
          .from(opportunities)
          .leftJoin(companies, eq(opportunities.company_id, companies.id))
          .where(inArray(opportunities.contact_id, [...contactIds]));
        const byContact = new Map<number, (Opportunity & { company_name: string | null })[]>();
        for (const row of rows) {
          if (row.contact_id == null) continue;
          const arr = byContact.get(row.contact_id);
          if (arr) arr.push(row);
          else byContact.set(row.contact_id, [row]);
        }
        return contactIds.map((id) => byContact.get(id) ?? []);
      },
      { maxBatchSize: BATCH_CONTACT, batchScheduleFn: batchSchedule },
    ),

    opportunitiesByCompany: new DataLoader<number, (Opportunity & { company_name: string | null })[]>(
      async (companyIds) => {
        const rows = await db
          .select({
            id: opportunities.id,
            title: opportunities.title,
            url: opportunities.url,
            source: opportunities.source,
            status: opportunities.status,
            reward_usd: opportunities.reward_usd,
            reward_text: opportunities.reward_text,
            start_date: opportunities.start_date,
            end_date: opportunities.end_date,
            deadline: opportunities.deadline,
            first_seen: opportunities.first_seen,
            last_seen: opportunities.last_seen,
            score: opportunities.score,
            raw_context: opportunities.raw_context,
            metadata: opportunities.metadata,
            applied: opportunities.applied,
            applied_at: opportunities.applied_at,
            application_status: opportunities.application_status,
            application_notes: opportunities.application_notes,
            tags: opportunities.tags,
            company_id: opportunities.company_id,
            contact_id: opportunities.contact_id,
            created_at: opportunities.created_at,
            updated_at: opportunities.updated_at,
            company_name: companies.name,
          })
          .from(opportunities)
          .leftJoin(companies, eq(opportunities.company_id, companies.id))
          .where(inArray(opportunities.company_id, [...companyIds]));
        const byCompany = new Map<number, (Opportunity & { company_name: string | null })[]>();
        for (const row of rows) {
          if (row.company_id == null) continue;
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_CONTACT, batchScheduleFn: batchSchedule },
    ),

  };
}

export type Loaders = ReturnType<typeof createLoaders>;
