/**
 * Contact query resolvers.
 */

import { contacts, companies, contactEmails } from "@/db/schema";
import { resend } from "@/lib/resend";
import { eq, and, like, or, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../../context";

export const contactQueries = {
  async contacts(
    _parent: unknown,
    args: { companyId?: number; search?: string; limit?: number; offset?: number },
    context: GraphQLContext,
  ) {
    const limit = Math.min(args.limit ?? 50, 200);
    const offset = args.offset ?? 0;

    const conditions = [];
    if (args.companyId != null) {
      conditions.push(eq(contacts.company_id, args.companyId));
    }
    if (args.search) {
      const term = `%${args.search}%`;
      conditions.push(
        or(
          like(contacts.first_name, term),
          like(contacts.last_name, term),
          like(contacts.email, term),
          like(contacts.company, term),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      context.db
        .select()
        .from(contacts)
        .where(where)
        .limit(limit + 1)
        .offset(offset),
      context.db
        .select({ value: count() })
        .from(contacts)
        .where(where),
    ]);

    return {
      contacts: rows.slice(0, limit),
      totalCount: countRows[0]?.value ?? 0,
    };
  },

  async contact(_parent: unknown, args: { id: number }, context: GraphQLContext) {
    const rows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, args.id))
      .limit(1);
    return rows[0] ?? null;
  },

  async contactByEmail(
    _parent: unknown,
    args: { email: string },
    context: GraphQLContext,
  ) {
    const rows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.email, args.email))
      .limit(1);
    return rows[0] ?? null;
  },

  async contactEmails(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    return context.db
      .select()
      .from(contactEmails)
      .where(eq(contactEmails.contact_id, args.contactId))
      .orderBy(contactEmails.created_at);
  },

  async companyContactEmails(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    return context.db
      .select({
        id: contactEmails.id,
        contact_id: contactEmails.contact_id,
        resend_id: contactEmails.resend_id,
        from_email: contactEmails.from_email,
        to_emails: contactEmails.to_emails,
        subject: contactEmails.subject,
        text_content: contactEmails.text_content,
        status: contactEmails.status,
        sent_at: contactEmails.sent_at,
        scheduled_at: contactEmails.scheduled_at,
        delivered_at: contactEmails.delivered_at,
        opened_at: contactEmails.opened_at,
        recipient_name: contactEmails.recipient_name,
        error_message: contactEmails.error_message,
        sequence_type: contactEmails.sequence_type,
        sequence_number: contactEmails.sequence_number,
        reply_received: contactEmails.reply_received,
        followup_status: contactEmails.followup_status,
        company_id: contactEmails.company_id,
        created_at: contactEmails.created_at,
        updated_at: contactEmails.updated_at,
        contact_first_name: contacts.first_name,
        contact_last_name: contacts.last_name,
        contact_position: contacts.position,
      })
      .from(contactEmails)
      .innerJoin(contacts, eq(contactEmails.contact_id, contacts.id))
      .where(eq(contacts.company_id, args.companyId))
      .orderBy(desc(contactEmails.created_at));
  },

  async resendEmail(_parent: unknown, args: { resendId: string }, context: GraphQLContext) {
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Non-Resend records (LinkedIn DMs, etc.) — serve from DB
    if (!isValidUUID.test(args.resendId)) {
      const [row] = await context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.resend_id, args.resendId))
        .limit(1);
      if (!row) return null;
      const toEmails = JSON.parse(row.to_emails) as string[];
      return {
        id: row.resend_id,
        from: row.from_email,
        to: toEmails,
        subject: row.subject ?? null,
        text: row.text_content ?? null,
        html: row.html_content ?? null,
        lastEvent: row.status,
        createdAt: row.sent_at ?? row.created_at,
        scheduledAt: null,
        cc: null,
        bcc: null,
      };
    }

    const data = await resend.instance.getEmail(args.resendId);
    if (!data) return null;
    return {
      id: data.id,
      from: data.from,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject ?? null,
      text: data.text ?? null,
      html: data.html ?? null,
      lastEvent: data.last_event ?? null,
      createdAt: data.created_at,
      scheduledAt: data.scheduled_at ?? null,
      cc: data.cc ?? null,
      bcc: data.bcc ?? null,
    };
  },
};
