import { contactEmails, receivedEmails, contacts, companies, replyDrafts } from "@/db/schema";
import { eq, and, or, count, desc, sql, like, isNull } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function toMs(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return new Date(dateStr).getTime() || 0;
}

interface ThreadSummaryRow {
  contact_id: number;
  slug: string | null;
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
      args: { classification?: string; search?: string; sortBy?: string; limit?: number; offset?: number },
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
          slug: contacts.slug,
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
          contacts.slug,
          contacts.first_name,
          contacts.last_name,
          contacts.email,
          contacts.position,
          companies.name,
          companies.key,
        ) as ThreadSummaryRow[];

      // Get all non-archived received emails matched to contacts, sorted by date desc
      const allInbound = await context.db
        .select({
          id: receivedEmails.id,
          matched_contact_id: receivedEmails.matched_contact_id,
          received_at: receivedEmails.received_at,
          classification: receivedEmails.classification,
          classification_confidence: receivedEmails.classification_confidence,
        })
        .from(receivedEmails)
        .where(and(
          sql`${receivedEmails.matched_contact_id} IS NOT NULL`,
          isNull(receivedEmails.archived_at),
        ))
        .orderBy(desc(receivedEmails.received_at));

      // Track contacts that have archived inbound (to hide fully-archived threads)
      const archivedInbound = await context.db
        .selectDistinct({ matched_contact_id: receivedEmails.matched_contact_id })
        .from(receivedEmails)
        .where(and(
          sql`${receivedEmails.matched_contact_id} IS NOT NULL`,
          sql`${receivedEmails.archived_at} IS NOT NULL`,
        ));
      const archivedContactIds = new Set(archivedInbound.map((r) => r.matched_contact_id!));

      // Aggregate inbound data per contact
      const inboundMap = new Map<number, InboundSummary>();
      for (const row of allInbound) {
        const cid = row.matched_contact_id!;
        const existing = inboundMap.get(cid);
        if (!existing) {
          inboundMap.set(cid, {
            matched_contact_id: cid,
            inbound_count: 1,
            latest_inbound_at: row.received_at,
            latest_classification: row.classification,
            latest_confidence: row.classification_confidence,
          });
        } else {
          existing.inbound_count++;
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

      // Fetch pending drafts per contact
      const pendingDrafts = await context.db
        .select({
          contact_id: replyDrafts.contact_id,
          draft_id: replyDrafts.id,
        })
        .from(replyDrafts)
        .where(eq(replyDrafts.status, "pending"));

      const draftMap = new Map<number, number>();
      for (const d of pendingDrafts) {
        draftMap.set(d.contact_id, d.draft_id);
      }

      // Find inbound-only contacts (have received emails but no outbound in contact_emails)
      const outboundContactIds = new Set(outboundThreads.map((r) => r.contact_id));
      const inboundOnlyContactIds = [...inboundMap.keys()].filter((cid) => !outboundContactIds.has(cid));

      if (inboundOnlyContactIds.length > 0) {
        const inboundOnlyContacts = await context.db
          .select({
            id: contacts.id,
            slug: contacts.slug,
            first_name: contacts.first_name,
            last_name: contacts.last_name,
            email: contacts.email,
            position: contacts.position,
            company_name: companies.name,
            company_key: companies.key,
          })
          .from(contacts)
          .leftJoin(companies, eq(contacts.company_id, companies.id))
          .where(sql`${contacts.id} IN (${sql.join(inboundOnlyContactIds.map(id => sql`${id}`), sql`, `)})`);

        for (const c of inboundOnlyContacts) {
          outboundThreads.push({
            contact_id: c.id,
            slug: c.slug,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            position: c.position,
            company_name: c.company_name,
            company_key: c.company_key,
            outbound_count: 0,
            latest_outbound_at: null,
            latest_status: null,
          });
        }
      }

      // Fetch authority scores and conversation stages for contacts
      const contactIds = outboundThreads.map((r) => r.contact_id);
      const contactExtras = contactIds.length > 0
        ? await context.db
            .select({
              id: contacts.id,
              authority_score: contacts.authority_score,
              conversation_stage: contacts.conversation_stage,
            })
            .from(contacts)
            .where(sql`${contacts.id} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

      const authorityMap = new Map<number, number>();
      const stageMap = new Map<number, string | null>();
      for (const c of contactExtras) {
        authorityMap.set(c.id, c.authority_score ?? 0);
        stageMap.set(c.id, c.conversation_stage);
      }

      // Classification priority weights
      const classWeight: Record<string, number> = {
        interested: 100,
        info_request: 80,
        auto_reply: 20,
        not_interested: 10,
        bounced: 0,
        unsubscribe: 0,
      };

      // Merge outbound + inbound into threads
      let threads = outboundThreads.map((row) => {
        const inbound = inboundMap.get(row.contact_id);
        const outboundAt = row.latest_outbound_at || "";
        const inboundAt = inbound?.latest_inbound_at || "";
        const lastMessageAt = toMs(inboundAt) > toMs(outboundAt) ? inboundAt : outboundAt;
        const lastMessageDirection = inboundAt > outboundAt ? "inbound" : "outbound";

        const preview = previewMap.get(row.contact_id);
        const totalMessages = (row.outbound_count || 0) + (inbound?.inbound_count || 0);
        const hasPendingDraft = draftMap.has(row.contact_id);
        const draftId = draftMap.get(row.contact_id) ?? null;

        // Compute priority score
        const classification = inbound?.latest_classification || null;
        const confidence = inbound?.latest_confidence || 0;
        const cWeight = classWeight[classification || ""] ?? 0;
        const authority = authorityMap.get(row.contact_id) ?? 0;

        // Recency bonus: inbound within last 24h = +50, 48h = +30, 72h = +10
        const inboundMs = toMs(inboundAt);
        const hoursSinceInbound = inboundMs > 0 ? (Date.now() - inboundMs) / 3600000 : Infinity;
        const recencyBonus = hoursSinceInbound < 24 ? 50 : hoursSinceInbound < 48 ? 30 : hoursSinceInbound < 72 ? 10 : 0;

        const draftBonus = hasPendingDraft ? 20 : 0;
        const priorityScore = (cWeight * confidence) + (authority * 20) + recencyBonus + draftBonus;

        return {
          contactId: row.contact_id,
          contactSlug: row.slug,
          contactName: `${row.first_name} ${row.last_name}`.trim(),
          contactEmail: row.email,
          contactPosition: row.position,
          companyName: row.company_name,
          companyKey: row.company_key,
          lastMessageAt,
          lastMessagePreview: preview?.text?.slice(0, 120) || preview?.subject || null,
          lastMessageDirection,
          classification,
          classificationConfidence: inbound?.latest_confidence || null,
          totalMessages,
          hasReply: !!inbound,
          latestStatus: row.latest_status,
          priorityScore,
          hasPendingDraft,
          draftId,
          conversationStage: stageMap.get(row.contact_id) || null,
          messages: [], // Populated only in emailThread query
        };
      });

      // Hide threads where all inbound emails have been archived
      threads = threads.filter((t) => {
        if (!archivedContactIds.has(t.contactId)) return true; // no archived inbound — keep
        return inboundMap.has(t.contactId); // has archived, keep only if non-archived inbound remains
      });

      // Only show threads with inbound replies in the inbox
      threads = threads.filter((t) => t.hasReply);

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

      // Sort by priority or recency
      if (args.sortBy === "priority") {
        threads.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
      } else {
        threads.sort((a, b) => toMs(b.lastMessageAt) - toMs(a.lastMessageAt));
      }

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
          slug: contacts.slug,
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

      // Sort reverse-chronologically (newest first)
      messages.sort((a, b) => toMs(b.sentAt) - toMs(a.sentAt));

      // Get latest inbound classification
      const latestInbound = inbound[0];

      return {
        contactId: contact.id,
        contactSlug: contact.slug,
        contactName: `${contact.first_name} ${contact.last_name}`.trim(),
        contactEmail: contact.email,
        contactPosition: contact.position,
        companyName: contact.company_name,
        companyKey: contact.company_key,
        lastMessageAt: messages[0]?.sentAt || "",
        lastMessagePreview: null,
        lastMessageDirection: messages[0]?.direction || "outbound",
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
