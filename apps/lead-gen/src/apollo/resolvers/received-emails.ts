import { receivedEmails, contacts, contactEmails, type ReceivedEmail as DbReceivedEmail, type ContactEmail } from "@/db/schema";
import { eq, and, count, desc, isNull, isNotNull } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { textToHtml } from "@/lib/email";
import { resend } from "@/lib/resend";
import { classifyReplyHybrid } from "@/lib/email/reply-classifier";
import { matchContact } from "@/lib/email/contact-matcher";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function parseJsonOrNull(val: string | null | undefined): unknown {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export const receivedEmailResolvers = {
  ReceivedEmail: {
    resendId: (parent: DbReceivedEmail) => parent.resend_id,
    fromEmail: (parent: DbReceivedEmail) => parent.from_email ?? null,
    toEmails: (parent: DbReceivedEmail) => parseJsonArray(parent.to_emails),
    ccEmails: (parent: DbReceivedEmail) => parseJsonArray(parent.cc_emails),
    replyToEmails: (parent: DbReceivedEmail) => parseJsonArray(parent.reply_to_emails),
    messageId: (parent: DbReceivedEmail) => parent.message_id ?? null,
    htmlContent: (parent: DbReceivedEmail) => parent.html_content ?? null,
    textContent: (parent: DbReceivedEmail) => parent.text_content ?? null,
    attachments: (parent: DbReceivedEmail) => parseJsonOrNull(parent.attachments),
    receivedAt: (parent: DbReceivedEmail) => parent.received_at,
    archivedAt: (parent: DbReceivedEmail) => parent.archived_at ?? null,
    classification: (parent: DbReceivedEmail) => parent.classification ?? null,
    classificationConfidence: (parent: DbReceivedEmail) => parent.classification_confidence ?? null,
    classifiedAt: (parent: DbReceivedEmail) => parent.classified_at ?? null,
    matchedContactId: (parent: DbReceivedEmail) => parent.matched_contact_id ?? null,
    async matchedContact(parent: DbReceivedEmail, _args: unknown, context: GraphQLContext) {
      if (!parent.matched_contact_id) return null;
      const [contact] = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.id, parent.matched_contact_id))
        .limit(1);
      return contact ?? null;
    },
    matchedOutboundId: (parent: DbReceivedEmail) => parent.matched_outbound_id ?? null,
    async sentReplies(parent: DbReceivedEmail, _args: unknown, context: GraphQLContext) {
      const explicit = await context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.in_reply_to_received_id, parent.id))
        .orderBy(desc(contactEmails.sent_at));

      if (explicit.length > 0) return explicit;

      // Fallback: all outbound emails to the same matched contact
      if (!parent.matched_contact_id) return [];

      return context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.contact_id, parent.matched_contact_id))
        .orderBy(desc(contactEmails.sent_at));
    },
    createdAt: (parent: DbReceivedEmail) => parent.created_at,
    updatedAt: (parent: DbReceivedEmail) => parent.updated_at,
  },

  SentReply: {
    resendId: (parent: ContactEmail) => parent.resend_id,
    fromEmail: (parent: ContactEmail) => parent.from_email,
    toEmails: (parent: ContactEmail) => parseJsonArray(parent.to_emails),
    textContent: (parent: ContactEmail) => parent.text_content ?? null,
    htmlContent: (parent: ContactEmail) => parent.html_content ?? null,
    sentAt: (parent: ContactEmail) => parent.sent_at ?? null,
    createdAt: (parent: ContactEmail) => parent.created_at,
  },

  Query: {
    async receivedEmails(
      _parent: unknown,
      args: { limit?: number; offset?: number; archived?: boolean; classification?: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.archived === true) {
        conditions.push(isNotNull(receivedEmails.archived_at));
      } else if (args.archived === false || args.archived === undefined) {
        conditions.push(isNull(receivedEmails.archived_at));
      }

      if (args.classification) {
        conditions.push(eq(receivedEmails.classification, args.classification));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(receivedEmails)
          .where(where)
          .orderBy(desc(receivedEmails.received_at))
          .limit(limit)
          .offset(offset),
        context.db.select({ value: count() }).from(receivedEmails).where(where),
      ]);

      return {
        emails: rows,
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async receivedEmail(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const rows = await context.db
        .select()
        .from(receivedEmails)
        .where(eq(receivedEmails.id, args.id))
        .limit(1);
      return rows[0] ?? null;
    },
  },

  Mutation: {
    async archiveEmail(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const rows = await context.db
        .update(receivedEmails)
        .set({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.id, args.id))
        .returning();

      if (rows.length === 0) {
        return { success: false, message: "Email not found" };
      }

      return { success: true, message: "Email archived" };
    },

    async unarchiveEmail(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const rows = await context.db
        .update(receivedEmails)
        .set({
          archived_at: null,
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.id, args.id))
        .returning();

      if (rows.length === 0) {
        return { success: false, message: "Email not found" };
      }

      return { success: true, message: "Email unarchived" };
    },

    async classifyReceivedEmail(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const rows = await context.db
        .select()
        .from(receivedEmails)
        .where(eq(receivedEmails.id, args.id))
        .limit(1);

      const email = rows[0];
      if (!email) {
        return { success: false, classification: null, confidence: null, matchedContactId: null };
      }

      // Build thread context from matched outbound email for better classification
      const contactMatch = email.from_email
        ? await matchContact(email.from_email)
        : null;

      let threadContext: string | undefined;
      if (contactMatch?.outboundEmailId) {
        const [outbound] = await context.db
          .select({ subject: contactEmails.subject, text_content: contactEmails.text_content })
          .from(contactEmails)
          .where(eq(contactEmails.id, contactMatch.outboundEmailId))
          .limit(1);
        if (outbound) {
          threadContext = `Subject: ${outbound.subject}\n${outbound.text_content || ""}`;
        }
      }

      const result = await classifyReplyHybrid(email.subject || "", email.text_content || "", threadContext);

      await context.db
        .update(receivedEmails)
        .set({
          classification: result.label,
          classification_confidence: result.confidence,
          classified_at: new Date().toISOString(),
          ...(contactMatch?.contactId ? { matched_contact_id: contactMatch.contactId } : {}),
          ...(contactMatch?.outboundEmailId ? { matched_outbound_id: contactMatch.outboundEmailId } : {}),
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.id, args.id));

      // Side effect: unsubscribe → do_not_contact
      if (result.label === "unsubscribe" && contactMatch?.contactId) {
        await context.db
          .update(contacts)
          .set({ do_not_contact: true, updated_at: new Date().toISOString() })
          .where(eq(contacts.id, contactMatch.contactId));
      }

      // Side effect: update outbound email reply_classification
      if (contactMatch?.outboundEmailId) {
        await context.db
          .update(contactEmails)
          .set({
            reply_received: true,
            reply_received_at: new Date().toISOString(),
            reply_classification: result.label,
            updated_at: new Date().toISOString(),
          })
          .where(eq(contactEmails.id, contactMatch.outboundEmailId));
      }

      // Advance conversation state
      if (contactMatch?.contactId) {
        try {
          const { advanceConversationState } = await import("@/lib/email/conversation-state");
          await advanceConversationState(contactMatch.contactId, result.label);
        } catch { /* non-critical */ }
      }

      return {
        success: true,
        classification: result.label,
        confidence: result.confidence,
        matchedContactId: contactMatch?.contactId ?? null,
      };
    },

    async classifyAllPending(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const pending = await context.db
        .select()
        .from(receivedEmails)
        .where(isNull(receivedEmails.classification));

      let classified = 0;

      // Process in batches of 5 concurrent for LLM calls
      for (let i = 0; i < pending.length; i += 5) {
        const batch = pending.slice(i, i + 5);
        await Promise.all(
          batch.map(async (email) => {
            const contactMatch = email.from_email
              ? await matchContact(email.from_email)
              : null;

            let threadContext: string | undefined;
            if (contactMatch?.outboundEmailId) {
              const [outbound] = await context.db
                .select({ subject: contactEmails.subject, text_content: contactEmails.text_content })
                .from(contactEmails)
                .where(eq(contactEmails.id, contactMatch.outboundEmailId))
                .limit(1);
              if (outbound) {
                threadContext = `Subject: ${outbound.subject}\n${outbound.text_content || ""}`;
              }
            }

            const result = await classifyReplyHybrid(email.subject || "", email.text_content || "", threadContext);

            await context.db
              .update(receivedEmails)
              .set({
                classification: result.label,
                classification_confidence: result.confidence,
                classified_at: new Date().toISOString(),
                ...(contactMatch?.contactId ? { matched_contact_id: contactMatch.contactId } : {}),
                ...(contactMatch?.outboundEmailId ? { matched_outbound_id: contactMatch.outboundEmailId } : {}),
                updated_at: new Date().toISOString(),
              })
              .where(eq(receivedEmails.id, email.id));

            if (result.label === "unsubscribe" && contactMatch?.contactId) {
              await context.db
                .update(contacts)
                .set({ do_not_contact: true, updated_at: new Date().toISOString() })
                .where(eq(contacts.id, contactMatch.contactId));
            }

            if (contactMatch?.outboundEmailId) {
              await context.db
                .update(contactEmails)
                .set({
                  reply_received: true,
                  reply_received_at: new Date().toISOString(),
                  reply_classification: result.label,
                  updated_at: new Date().toISOString(),
                })
                .where(eq(contactEmails.id, contactMatch.outboundEmailId));
            }

            // Advance conversation state
            if (contactMatch?.contactId) {
              try {
                const { advanceConversationState } = await import("@/lib/email/conversation-state");
                await advanceConversationState(contactMatch.contactId, result.label);
              } catch { /* non-critical */ }
            }

            classified++;
          }),
        );
      }

      return {
        success: true,
        classified,
        message: `Classified ${classified} email(s) with LLM hybrid classifier`,
      };
    },

    async previewEmail(
      _parent: unknown,
      args: {
        input: {
          recipientEmail: string;
          subject: string;
          content: string;
          drySend?: boolean;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { subject, content, drySend } = args.input;
      const htmlContent = textToHtml(content);

      let drySendResult: string | null = null;

      if (drySend) {
        const result = await resend.instance.send({
          to: "nicolai.vadim@gmail.com",
          subject: `[Preview] ${subject}`,
          html: htmlContent,
          from: "contact@vadim.blog",
        });
        drySendResult = result.id || null;
      }

      return {
        htmlContent,
        subject,
        drySendResult,
      };
    },
  },
};
