import { contacts, contactReminders, contactEmails, type ContactReminder as DbContactReminder } from "@/db/schema";
import { eq, and, lte, sql, max, desc, inArray } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

// ─── ML formula (TS port of Rust compute_next_touch_score) ───────────────────

/**
 * Compute the urgency score for re-engaging a contact.
 *
 * Formula: next_touch_score = authority_score × urgency
 *
 * Urgency is an inverse-sigmoid centred at 14 days:
 *   urgency = 1 / (1 + exp(-0.2 × (days − 14)))
 *
 * Special cases:
 *   hasReply = true  → 0.0 (conversation active)
 *   daysSince = null → urgency = 1.0 (never contacted)
 *   days >= 90       → urgency clamped to 1.0 (gone cold)
 */
export function computeNextTouchScore(
  authorityScore: number,
  daysSinceLastEmail: number | null,
  hasReply: boolean,
): number {
  if (hasReply) return 0.0;

  let urgency: number;
  if (daysSinceLastEmail === null) {
    urgency = 1.0;
  } else if (daysSinceLastEmail >= 90) {
    urgency = 1.0;
  } else {
    const x = daysSinceLastEmail - 14;
    urgency = 1 / (1 + Math.exp(-0.2 * x));
  }

  return Math.round(authorityScore * urgency * 100) / 100;
}

// ─── Recurrence helpers ──────────────────────────────────────────────────────

function addRecurrenceDays(recurrence: string): number {
  switch (recurrence) {
    case "weekly":   return 7;
    case "biweekly": return 14;
    case "monthly":  return 30;
    default:         return 0;
  }
}

function advanceDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── ContactReminder field resolver ─────────────────────────────────────────

const ContactReminder = {
  contactId: (p: DbContactReminder) => p.contact_id,
  remindAt:  (p: DbContactReminder) => p.remind_at,
  snoozedUntil: (p: DbContactReminder) => p.snoozed_until ?? null,
  createdAt: (p: DbContactReminder) => p.created_at,
  updatedAt: (p: DbContactReminder) => p.updated_at,
};

// ─── Resolver map ────────────────────────────────────────────────────────────

export const remindersResolvers = {
  ContactReminder,

  Query: {
    async contactReminders(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      return context.db
        .select()
        .from(contactReminders)
        .where(eq(contactReminders.contact_id, args.contactId))
        .orderBy(contactReminders.remind_at);
    },

    async dueReminders(_parent: unknown, _args: unknown, context: GraphQLContext) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const rows = await context.db
        .select({
          reminder: contactReminders,
          contact: contacts,
        })
        .from(contactReminders)
        .innerJoin(contacts, eq(contactReminders.contact_id, contacts.id))
        .where(
          and(
            eq(contactReminders.status, "pending"),
            lte(contactReminders.remind_at, now),
          ),
        )
        .orderBy(contactReminders.remind_at);

      return rows.map((r) => ({ reminder: r.reminder, contact: r.contact }));
    },
  },

  Mutation: {
    async createReminder(
      _parent: unknown,
      args: { input: { contactId: number; remindAt: string; recurrence?: string | null; note?: string | null } },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { contactId, remindAt, recurrence, note } = args.input;
      const rows = await context.db
        .insert(contactReminders)
        .values({
          contact_id: contactId,
          remind_at: remindAt,
          recurrence: recurrence ?? "none",
          note: note ?? null,
          status: "pending",
        })
        .returning();
      return rows[0];
    },

    async updateReminder(
      _parent: unknown,
      args: { id: number; input: { remindAt?: string | null; recurrence?: string | null; note?: string | null; status?: string | null } },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.input.remindAt   != null) patch.remind_at  = args.input.remindAt;
      if (args.input.recurrence != null) patch.recurrence = args.input.recurrence;
      if (args.input.note       != null) patch.note       = args.input.note;
      if (args.input.status     != null) patch.status     = args.input.status;

      const rows = await context.db
        .update(contactReminders)
        .set(patch)
        .where(eq(contactReminders.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Reminder not found");
      return rows[0];
    },

    async snoozeReminder(
      _parent: unknown,
      args: { id: number; days: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const snoozedUntil = advanceDate(new Date().toISOString().slice(0, 10), args.days);

      const [existing] = await context.db
        .select()
        .from(contactReminders)
        .where(eq(contactReminders.id, args.id))
        .limit(1);
      if (!existing) throw new Error("Reminder not found");

      const patch: Record<string, unknown> = {
        status: "snoozed",
        snoozed_until: snoozedUntil,
        updated_at: new Date().toISOString(),
      };
      // If recurring, also advance the remind_at
      if (existing.recurrence !== "none") {
        patch.remind_at = snoozedUntil;
      }

      const rows = await context.db
        .update(contactReminders)
        .set(patch)
        .where(eq(contactReminders.id, args.id))
        .returning();
      return rows[0];
    },

    async dismissReminder(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const [existing] = await context.db
        .select()
        .from(contactReminders)
        .where(eq(contactReminders.id, args.id))
        .limit(1);
      if (!existing) throw new Error("Reminder not found");

      // Mark as done
      const rows = await context.db
        .update(contactReminders)
        .set({ status: "done", updated_at: new Date().toISOString() })
        .where(eq(contactReminders.id, args.id))
        .returning();

      // If recurring → create next occurrence automatically
      if (existing.recurrence !== "none") {
        const intervalDays = addRecurrenceDays(existing.recurrence);
        const nextRemindAt = advanceDate(existing.remind_at, intervalDays);
        await context.db.insert(contactReminders).values({
          contact_id: existing.contact_id,
          remind_at: nextRemindAt,
          recurrence: existing.recurrence,
          note: existing.note,
          status: "pending",
        });
      }

      return rows[0];
    },

    async computeNextTouchScores(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      // 1. Fetch all contacts for the company
      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, args.companyId));

      if (companyContacts.length === 0) {
        return { success: true, message: "No contacts found", contactsUpdated: 0, topContacts: [] };
      }

      const contactIds = companyContacts.map((c) => c.id);

      // 2. Get last sent_at and reply status per contact in a single query
      type EmailSummary = { contact_id: number; last_sent_at: string | null; any_reply: boolean };
      const emailSummaries: EmailSummary[] = await context.db
        .select({
          contact_id: contactEmails.contact_id,
          last_sent_at: max(contactEmails.sent_at).as("last_sent_at"),
          any_reply: sql<boolean>`bool_or(${contactEmails.reply_received})`.as("any_reply"),
        })
        .from(contactEmails)
        .where(inArray(contactEmails.contact_id, contactIds))
        .groupBy(contactEmails.contact_id) as EmailSummary[];

      const summaryMap = new Map<number, EmailSummary>(
        emailSummaries.map((s) => [s.contact_id, s]),
      );

      // 3. Compute and update each contact
      const scored: Array<{ contactId: number; firstName: string; lastName: string; position: string | null; nextTouchScore: number; lastContactedAt: string | null }> = [];

      for (const contact of companyContacts) {
        const summary = summaryMap.get(contact.id);
        const hasReply = summary?.any_reply ?? false;
        const lastSent = summary?.last_sent_at ?? null;

        let daysSince: number | null = null;
        if (lastSent) {
          const msPerDay = 86_400_000;
          daysSince = Math.floor((Date.now() - new Date(lastSent).getTime()) / msPerDay);
        }

        const authorityScore = contact.authority_score ?? 0.1;
        const score = computeNextTouchScore(authorityScore, daysSince, hasReply);

        // TODO: use DataLoader — this issues one UPDATE per contact (N+1); batch with a single UPDATE ... WHERE id IN (...)
        await context.db
          .update(contacts)
          .set({
            next_touch_score: score,
            last_contacted_at: lastSent,
            updated_at: new Date().toISOString(),
          })
          .where(eq(contacts.id, contact.id));

        scored.push({
          contactId: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          position: contact.position ?? null,
          nextTouchScore: score,
          lastContactedAt: lastSent,
        });
      }

      // 4. Return top 10 by score
      const topContacts = scored
        .sort((a, b) => b.nextTouchScore - a.nextTouchScore)
        .slice(0, 10);

      return {
        success: true,
        message: `Computed touch scores for ${scored.length} contact(s)`,
        contactsUpdated: scored.length,
        topContacts,
      };
    },
  },
};
