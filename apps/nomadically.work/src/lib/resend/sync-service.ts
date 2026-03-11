import { Resend } from "resend";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, or } from "drizzle-orm";
import { createD1HttpClient } from "@/db/d1-http";
import { contacts, contactEmails, companies } from "@/db/schema";

export type ResendStatus =
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "delivery_delayed"
  | "opened"
  | "clicked"
  | "scheduled"
  | "cancelled";

export interface SyncResult {
  totalFetched: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  contactMatchCount: number;
  companyMatchCount: number;
  duration: number;
}

export interface SyncConfig {
  maxEmails?: number;
  maxBatches?: number;
  batchSize?: number;
  delayMs?: number;
}

interface ContactCacheEntry {
  id: number;
  companyId: number | null;
}

const statusMap: Record<string, string> = {
  sent: "sent",
  delivered: "delivered",
  bounced: "bounced",
  complained: "complained",
  delivery_delayed: "sent",
  opened: "delivered",
  clicked: "delivered",
  scheduled: "scheduled",
  cancelled: "cancelled",
};

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export class ResendSyncService {
  private resend: Resend;
  private companyCache = new Map<string, number>();
  private contactCache = new Map<string, ContactCacheEntry>();
  private companiesMatched = new Set<number>();
  private contactsMatched = new Set<number>();

  constructor(apiKey?: string) {
    this.resend = new Resend(apiKey || process.env.RESEND_API_KEY);
  }

  async fetchAllEmails(config: SyncConfig = {}): Promise<any[]> {
    const {
      maxEmails = 10000,
      maxBatches = 200,
      batchSize = 100,
      delayMs = 100,
    } = config;

    const allEmails: any[] = [];
    let hasMore = true;
    let afterCursor: string | undefined;
    let batchCount = 0;

    while (hasMore && allEmails.length < maxEmails && batchCount < maxBatches) {
      batchCount++;

      const response = await this.resend.emails.list({
        limit: batchSize,
        ...(afterCursor && { after: afterCursor }),
      });

      if (!response.data) {
        throw new Error("Failed to fetch emails from Resend");
      }

      const batch = response.data.data;
      allEmails.push(...batch);
      hasMore = response.data.has_more || false;

      console.log(
        `  Batch ${batchCount}: Fetched ${batch.length} emails (total: ${allEmails.length})...`,
      );

      if (hasMore && batch.length > 0) {
        afterCursor = batch[batch.length - 1].id;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return allEmails;
  }

  async findContactAndCompany(recipientEmail: string): Promise<{
    contactId: number | null;
    companyId: number | null;
  }> {
    let contactId: number | null = null;
    let companyId: number | null = null;
    const db = getDb();

    if (this.contactCache.has(recipientEmail)) {
      const cached = this.contactCache.get(recipientEmail)!;
      return { contactId: cached.id, companyId: cached.companyId };
    }

    const normalized = recipientEmail.toLowerCase().trim();
    const contact = await db
      .select()
      .from(contacts)
      .where(sql`LOWER(${contacts.email}) = ${normalized}`)
      .limit(1);

    if (contact.length > 0) {
      contactId = contact[0].id;
      companyId = contact[0].company_id;
      this.contactCache.set(recipientEmail, { id: contactId, companyId });
      this.contactsMatched.add(contactId);
      if (companyId) this.companiesMatched.add(companyId);
    } else {
      const domain = recipientEmail.split("@")[1];
      if (domain) {
        if (this.companyCache.has(domain)) {
          companyId = this.companyCache.get(domain)!;
        } else {
          const company = await db
            .select()
            .from(companies)
            .where(
              or(
                eq(companies.website, `https://${domain}`),
                eq(companies.website, `http://${domain}`),
                eq(companies.website, domain),
              ),
            )
            .limit(1);

          if (company.length > 0) {
            companyId = company[0].id;
            this.companyCache.set(domain, companyId);
            this.companiesMatched.add(companyId);
          }
        }
      }
    }

    return { contactId, companyId };
  }

  mapStatus(resendStatus: string): string {
    return statusMap[resendStatus] || "sent";
  }

  async syncEmail(email: any): Promise<{
    action: "created" | "updated" | "skipped";
    error?: string;
  }> {
    try {
      const db = getDb();
      const status = this.mapStatus(email.last_event);

      const existing = await db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.resend_id, email.id))
        .limit(1);

      if (existing.length === 0) {
        const recipientEmail = Array.isArray(email.to) ? email.to[0] : email.to;
        if (!recipientEmail) return { action: "skipped" };

        const match = await this.findContactAndCompany(recipientEmail);
        if (!match.contactId) return { action: "skipped" }; // Skip emails without matching contacts

        await db.insert(contactEmails).values({
          contact_id: match.contactId,
          resend_id: email.id,
          from_email: email.from || "unknown@resend.dev",
          to_emails: JSON.stringify(Array.isArray(email.to) ? email.to : [email.to]),
          subject: email.subject || "No Subject",
          status,
          sent_at: email.created_at,
          delivered_at: status === "delivered" ? new Date().toISOString() : null,
          company_id: match.companyId,
        });

        return { action: "created" };
      } else {
        const existingEmail = existing[0];
        let needsUpdate = false;
        const updates: Record<string, any> = {};

        if (existingEmail.status !== status) {
          updates.status = status;
          if (status === "delivered") {
            updates.delivered_at = new Date().toISOString();
          }
          needsUpdate = true;
        }

        if (needsUpdate) {
          await db
            .update(contactEmails)
            .set(updates)
            .where(eq(contactEmails.resend_id, email.id));
          return { action: "updated" };
        }

        return { action: "skipped" };
      }
    } catch (error) {
      return {
        action: "skipped",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async syncAll(config: SyncConfig = {}): Promise<SyncResult> {
    const startTime = Date.now();

    this.companiesMatched.clear();
    this.contactsMatched.clear();

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const allEmails = await this.fetchAllEmails(config);

    if (allEmails.length === 0) {
      return {
        totalFetched: 0,
        newCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        contactMatchCount: 0,
        companyMatchCount: 0,
        duration: Date.now() - startTime,
      };
    }

    for (const email of allEmails) {
      const result = await this.syncEmail(email);

      if (result.action === "created") newCount++;
      else if (result.action === "updated") updatedCount++;
      else skippedCount++;

      if (result.error) errorCount++;
    }

    return {
      totalFetched: allEmails.length,
      newCount,
      updatedCount,
      skippedCount,
      errorCount,
      contactMatchCount: this.contactsMatched.size,
      companyMatchCount: this.companiesMatched.size,
      duration: Date.now() - startTime,
    };
  }

  clearCaches(): void {
    this.companyCache.clear();
    this.contactCache.clear();
    this.companiesMatched.clear();
    this.contactsMatched.clear();
  }
}
