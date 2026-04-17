import { webhookEvents } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

export const webhookEventResolvers = {
  Query: {
    async webhookEvents(
      _parent: unknown,
      args: { limit?: number; offset?: number; eventType?: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = args.eventType
        ? eq(webhookEvents.event_type, args.eventType)
        : undefined;

      const [events, totalResult] = await Promise.all([
        context.db
          .select({
            id: webhookEvents.id,
            event_type: webhookEvents.event_type,
            email_id: webhookEvents.email_id,
            from_email: webhookEvents.from_email,
            to_emails: webhookEvents.to_emails,
            subject: webhookEvents.subject,
            http_status: webhookEvents.http_status,
            error: webhookEvents.error,
            created_at: webhookEvents.created_at,
          })
          .from(webhookEvents)
          .where(conditions)
          .orderBy(desc(webhookEvents.created_at))
          .limit(limit)
          .offset(offset),
        context.db
          .select({ count: count() })
          .from(webhookEvents)
          .where(conditions),
      ]);

      return {
        events: events.map((e) => ({
          id: e.id,
          eventType: e.event_type,
          emailId: e.email_id,
          fromEmail: e.from_email,
          toEmails: e.to_emails,
          subject: e.subject,
          httpStatus: e.http_status,
          error: e.error,
          createdAt: e.created_at,
        })),
        totalCount: totalResult[0]?.count ?? 0,
      };
    },
  },
};
