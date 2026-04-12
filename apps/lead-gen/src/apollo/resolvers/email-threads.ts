import { contactEmails, receivedEmails, contacts, companies } from "@/db/schema";
import { eq, and, or, count, desc, sql, like, isNull } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

interface ThreadSummaryRow {
  contact_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  company_name: string | null;
  company_key: string | null;
  outbound_count: number;
  latest_outbound_at: string | null;
  latest_status: string | null;
}

interface InboundSummary {
  matched_contact_id: number;
  inbound_count: number;
  latest_inbound_at: string | null;
  latest_classification: string | null;
  latest_confidence: number | null;
}

export const emailThreadResolvers = {
  Query: {
    async emailThreads(
      _parent: unknown,
      args: { classification?: string; search?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      // Get all contacts that have outbound emails
      const outboundThreads = await context.db
        .select({
          contact_id: contactEmails.contact_id,
          first_name: contacts.first_name,
          last_name: contacts.last_name,
          email: contacts.email,
          position: contacts.position,
          company_name: companies.name,
          company_key: companies.key,
          outbound_count: count(contactEmails.id),
          latest_outbound_at: sql<string>`max(${contactEmails.sent_at})`,
          latest_status: sql<string>`(
            SELECT ce2.status FROM contact_emails ce2
            WHERE ce2.contact_id = ${contactEmails.contact_id}
            ORDER BY ce2.sent_at DESC NULLS LAST
            LIMIT 1
          )`,
        })
        .from(contactEmails)
        .innerJoin(contacts, eq(contactEmails.contact_id, contacts.id))
        .leftJoin(companies, eq(contacts.company_id, companies.id))
        .groupBy(
          contactEmails.contact_id,
          contacts.id,
          contacts.first_name,
          contacts.last_name,
          contacts.email,
          contacts.position,
          companies.name,
          companies.key,
        ) as ThreadSummaryRow[];

      // Get inbound summary per matched contact
      const inboundByContact = await context.db
        .select({
          matched_contact_id: receivedEmails.matched_contact_id,
          inbound_count: count(receivedEmails.id),
          latest_inbound_at: sql<string>`max(${receivedEmails.received_at})`,
          latest_classification: sql<string>`(
            SELECT re2.classification FROM received_emails re2
            WHERE re2.matched_contact_id = ${receivedEmails.matched_contact_id}
            AND re2.classification IS NOT NULL
            ORDER BY re2.received_at DESC
            LIMIT 1
          )`,
          latest_confidence: sql<number>`(
            SELECT re2.classification_confidence FROM received_emails re2
            WHERE re2.matched_contact_id = ${receivedEmails.matched_contact_id}
            AND re2.classification IS NOT NULL
            ORDER BY re2.received_at DESC
            LIMIT 1
          )`,
        })
        .from(receivedEmails)
        .where(sql`${receivedEmails.matched_contact_id} IS NOT NULL`)
        .groupBy(receivedEmails.matched_contact_id) as InboundSummary[];

      const inboundMap = new Map<number, InboundSummary>();
      for (const row of inboundByContact) {
        if (row.matched_contact_id) {
          inboundMap.set(row.matched_contact_id, row);
        }
      }

      // Get latest outbound text per contact for preview
      const previewRows = await context.db
        .select({
          contact_id: contactEmails.contact_id,
          text_content: contactEmails.text_content,
          subject: contactEmails.subject,
          sent_at: contactEmails.sent_at,
        })
        .from(contactEmails)
        .where(
          sql`(${contactEmails.contact_id}, ${contactEmails.sent_at}) IN (
            SELECT ce3.contact_id, max(ce3.sent_at)
            FROM contact_emails ce3
            GROUP BY ce3.contact_id
          )`,
        );

      const previewMap = new Map<number, { text: string; subject: string }>();
      for (const row of previewRows) {
        previewMap.set(row.contact_id, {
          text: row.text_content || row.subject,
          subject: row.subject,
        });
      }

      // Merge outbound + inbound into threads
      let threads = outboundThreads.map((row) => {
        const inbound = inboundMap.get(row.contact_id);
        const outboundAt = row.latest_outbound_at || "";
        const inboundAt = inbound?.latest_inbound_at || "";
        const lastMessageAt = inboundAt > outboundAt ? inboundAt : outboundAt;
        const lastMessageDirection = inboundAt > outboundAt ? "inbound" : "outbound";

        const preview = previewMap.get(row.contact_id);
        const totalMessages = (row.outbound_count || 0) + (inbound?.inbound_count || 0);

        return {
          contactId: row.contact_id,
          contactName: `${row.first_name} ${row.last_name}`.trim(),
          contactEmail: row.email,
          contactPosition: row.position,
          companyName: row.company_name,
          companyKey: row.company_key,
          lastMessageAt,
          lastMessagePreview: preview?.text?.slice(0, 120) || preview?.subject || null,
          lastMessageDirection,
          classification: inbound?.latest_classification || null,
          classificationConfidence: inbound?.latest_confidence || null,
          totalMessages,
          hasReply: !!inbound,
          latestStatus: row.latest_status,
          messages: [], // Populated only in emailThread query
        };
      });

      // Filter by classification
      if (args.classification) {
        threads = threads.filter((t) => t.classification === args.classification);
      }

      // Filter by search
      if (args.search) {
        const term = args.search.toLowerCase();
        threads = threads.filter(
          (t) =>
            t.contactName.toLowerCase().includes(term) ||
            (t.contactEmail && t.contactEmail.toLowerCase().includes(term)) ||
            (t.companyName && t.companyName.toLowerCase().includes(term)),
        );
      }

      // Sort by most recent activity
      threads.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

      const totalCount = threads.length;
      const paged = threads.slice(offset, offset + limit);

      return { threads: paged, totalCount };
    },

    async emailThread(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      // Get contact info
      const contactRows = await context.db
        .select({
          id: contacts.id,
          first_name: contacts.first_name,
          last_name: contacts.last_name,
          email: contacts.email,
          position: contacts.position,
          company_name: companies.name,
          company_key: companies.key,
        })
        .from(contacts)
        .leftJoin(companies, eq(contacts.company_id, companies.id))
        .where(eq(contacts.id, args.contactId))
        .limit(1);

      const contact = contactRows[0];
      if (!contact) return null;

      // Fetch outbound + inbound in parallel
      const [outbound, inbound] = await Promise.all([
        context.db
          .select()
          .from(contactEmails)
          .where(eq(contactEmails.contact_id, args.contactId))
          .orderBy(desc(contactEmails.sent_at)),
        context.db
          .select()
          .from(receivedEmails)
          .where(eq(receivedEmails.matched_contact_id, args.contactId))
          .orderBy(desc(receivedEmails.received_at)),
      ]);

      // Merge into chronological messages
      const messages: Array<{
        id: number;
        direction: string;
        fromEmail: string;
        toEmails: string[];
        subject: string;
        textContent: string | null;
        htmlContent: string | null;
        sentAt: string | null;
        status: string | null;
        sequenceType: string | null;
        sequenceNumber: string | null;
        classification: string | null;
        classificationConfidence: number | null;
      }> = [];

      for (const e of outbound) {
        messages.push({
          id: e.id,
          direction: "outbound",
          fromEmail: e.from_email,
          toEmails: parseJsonArray(e.to_emails),
          subject: e.subject,
          textContent: e.text_content,
          htmlContent: e.html_content,
          sentAt: e.sent_at,
          status: e.status,
          sequenceType: e.sequence_type,
          sequenceNumber: e.sequence_number,
          classification: null,
          classificationConfidence: null,
        });
      }

      for (const e of inbound) {
        messages.push({
          id: e.id,
          direction: "inbound",
          fromEmail: e.from_email || "unknown",
          toEmails: parseJsonArray(e.to_emails),
          subject: e.subject || "(no subject)",
          textContent: e.text_content,
          htmlContent: e.html_content,
          sentAt: e.received_at,
          status: null,
          sequenceType: null,
          sequenceNumber: null,
          classification: e.classification,
          classificationConfidence: e.classification_confidence,
        });
      }

      // Sort chronologically (oldest first)
      messages.sort((a, b) => (a.sentAt || "").localeCompare(b.sentAt || ""));

      // Get latest inbound classification
      const latestInbound = inbound[0];

      return {
        contactId: contact.id,
        contactName: `${contact.first_name} ${contact.last_name}`.trim(),
        contactEmail: contact.email,
        contactPosition: contact.position,
        companyName: contact.company_name,
        companyKey: contact.company_key,
        lastMessageAt: messages[messages.length - 1]?.sentAt || "",
        lastMessagePreview: null,
        lastMessageDirection: messages[messages.length - 1]?.direction || "outbound",
        classification: latestInbound?.classification || null,
        classificationConfidence: latestInbound?.classification_confidence || null,
        totalMessages: messages.length,
        hasReply: inbound.length > 0,
        latestStatus: outbound[0]?.status || null,
        messages,
      };
    },
  },
};
