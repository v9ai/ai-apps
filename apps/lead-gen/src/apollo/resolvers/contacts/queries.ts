/**
 * Contact query resolvers.
 */

import { GraphQLError } from "graphql";
import { contacts, contactEmails, messages, receivedEmails } from "@/db/schema";
import { resend } from "@/lib/resend";
import { eq, and, like, or, count, desc, asc, sql, isNull } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";

function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  if (!isAdminEmail(context.userEmail)) {
    throw new GraphQLError("Admin access required", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export const contactQueries = {
  async contacts(
    _parent: unknown,
    args: {
      companyId?: number;
      search?: string;
      tag?: string;
      limit?: number;
      offset?: number;
      includeFlagged?: boolean | null;
    },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const limit = Math.min(args.limit ?? 50, 200);
    const offset = args.offset ?? 0;

    const conditions = [];
    // Soft filter: exclude contacts flagged for deletion unless caller opts in.
    // Outreach paths (e.g. email composers) must keep the default `false` so
    // flagged rows are not reachable. Admin/debug list views pass `true`.
    if (!args.includeFlagged) {
      conditions.push(
        or(eq(contacts.to_be_deleted, false), isNull(contacts.to_be_deleted)),
      );
    }
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
    if (args.tag) {
      // `tags` is a text column holding a JSON array. Containment via
      // `jsonb_build_array($tag::text)` is driver-safe (no need to
      // pre-serialize a JSON string parameter, which some Postgres drivers
      // re-escape and break the `::jsonb` cast).
      conditions.push(
        sql`${contacts.tags}::jsonb @> jsonb_build_array(${args.tag}::text)`,
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

  async contactTags(_parent: unknown, _args: unknown, context: GraphQLContext) {
    requireAdmin(context);
    const result = await context.db.execute(sql`
      SELECT tag, COUNT(*)::int AS count
      FROM contacts, jsonb_array_elements_text(${contacts.tags}::jsonb) AS tag
      WHERE ${contacts.tags} IS NOT NULL
        AND (${contacts.to_be_deleted} = false OR ${contacts.to_be_deleted} IS NULL)
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);
    return (result.rows ?? []) as { tag: string; count: number }[];
  },

  async contact(_parent: unknown, args: { id?: number; slug?: string }, context: GraphQLContext) {
    if (!args.id && !args.slug) return null;
    const condition = args.id ? eq(contacts.id, args.id) : eq(contacts.slug, args.slug!);
    const rows = await context.db
      .select()
      .from(contacts)
      .where(condition)
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

  async contactByLinkedinUrl(
    _parent: unknown,
    args: { linkedinUrl: string },
    context: GraphQLContext,
  ) {
    const stripped = args.linkedinUrl.replace(/\/+$/, "").split("?")[0];
    const withSlash = stripped + "/";
    const rows = await context.db
      .select()
      .from(contacts)
      .where(or(eq(contacts.linkedin_url, stripped), eq(contacts.linkedin_url, withSlash)))
      .orderBy(sql`${contacts.slug} ASC NULLS LAST`, asc(contacts.id))
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

  async contactReceivedEmails(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    return context.db
      .select()
      .from(receivedEmails)
      .where(eq(receivedEmails.matched_contact_id, args.contactId))
      .orderBy(desc(receivedEmails.received_at));
  },

  async contactMessages(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    return context.db
      .select()
      .from(messages)
      .where(eq(messages.contact_id, args.contactId))
      .orderBy(messages.sent_at);
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
