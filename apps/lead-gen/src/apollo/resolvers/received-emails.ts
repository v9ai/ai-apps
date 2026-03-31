import { receivedEmails, type ReceivedEmail as DbReceivedEmail } from "@/db/schema";
import { eq, and, count, desc, isNull, isNotNull } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { textToHtml } from "@/lib/email";
import { resend } from "@/lib/resend";

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
    createdAt: (parent: DbReceivedEmail) => parent.created_at,
    updatedAt: (parent: DbReceivedEmail) => parent.updated_at,
  },

  Query: {
    async receivedEmails(
      _parent: unknown,
      args: { limit?: number; offset?: number; archived?: boolean },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.archived === true) {
        conditions.push(isNotNull(receivedEmails.archived_at));
      } else if (args.archived === false || args.archived === undefined) {
        conditions.push(isNull(receivedEmails.archived_at));
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
        .returning({ id: receivedEmails.id });

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
        .returning({ id: receivedEmails.id });

      if (rows.length === 0) {
        return { success: false, message: "Email not found" };
      }

      return { success: true, message: "Email unarchived" };
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
