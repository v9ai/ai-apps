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
} from "@/db/schema";

const BATCH_SIZE = 100;

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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
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
      { maxBatchSize: BATCH_SIZE },
    ),

  };
}

export type Loaders = ReturnType<typeof createLoaders>;
