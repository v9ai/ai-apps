import { emailCampaigns, emailTemplates, contactEmails, contacts } from "@/db/schema";
import { eq, and, or, count, desc, sql, gte, isNotNull, gt, inArray } from "drizzle-orm";
import { addMinutes, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  buildSchedule,
  getSchedulePreview,
  personalizeEmailBody,
  textToStructuredHtml,
  isEmailBounced,
  markEmailAsReplied as markReplied,
  buildFollowUpInstructions,
  EmailConfig,
} from "@/lib/email";
import { generateReplyContent } from "@/lib/email/reply-generation";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function mapCampaign(row: typeof emailCampaigns.$inferSelect) {
  return {
    ...row,
    companyId: row.company_id ?? null,
    sequence: row.sequence ? JSON.parse(row.sequence) : null,
    delayDays: row.delay_days ? JSON.parse(row.delay_days) : null,
    startAt: row.start_at ?? null,
    fromEmail: row.from_email ?? null,
    replyTo: row.reply_to ?? null,
    totalRecipients: row.total_recipients,
    emailsSent: row.emails_sent,
    emailsScheduled: row.emails_scheduled,
    emailsFailed: row.emails_failed,
    recipientEmails: parseJsonArray(row.recipient_emails),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const emailCampaignResolvers = {
  Query: {
    async emailCampaigns(
      _parent: unknown,
      args: { status?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.status) conditions.push(eq(emailCampaigns.status, args.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(emailCampaigns)
          .where(where)
          .orderBy(desc(emailCampaigns.created_at))
          .limit(limit + 1)
          .offset(offset),
        context.db.select({ value: count() }).from(emailCampaigns).where(where),
      ]);

      return {
        campaigns: rows.slice(0, limit).map(mapCampaign),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async emailCampaign(_parent: unknown, args: { id: string }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, args.id))
        .limit(1);
      return rows[0] ? mapCampaign(rows[0]) : null;
    },

    async emailStats(_parent: unknown, _args: unknown, context: GraphQLContext) {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();

      const [
        sentTodayRows,
        sentThisWeekRows,
        sentThisMonthRows,
        scheduledTodayRows,
        scheduledFutureRows,
        totalSentRows,
        deliveredTodayRows,
        deliveredThisWeekRows,
        deliveredThisMonthRows,
        bouncedTodayRows,
        bouncedThisWeekRows,
        bouncedThisMonthRows,
        openedTodayRows,
        openedThisWeekRows,
        openedThisMonthRows,
      ] = await Promise.all([
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "sent"), gte(contactEmails.sent_at, todayStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "sent"), gte(contactEmails.sent_at, weekStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "sent"), gte(contactEmails.sent_at, monthStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(
            and(
              eq(contactEmails.status, "scheduled"),
              isNotNull(contactEmails.scheduled_at),
              gte(contactEmails.scheduled_at, todayStart),
            ),
          ),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(
            and(
              eq(contactEmails.status, "scheduled"),
              isNotNull(contactEmails.scheduled_at),
              gt(contactEmails.scheduled_at, now.toISOString()),
            ),
          ),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(eq(contactEmails.status, "sent")),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.delivered_at), gte(contactEmails.delivered_at, todayStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.delivered_at), gte(contactEmails.delivered_at, weekStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.delivered_at), gte(contactEmails.delivered_at, monthStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "bounced"), gte(contactEmails.sent_at, todayStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "bounced"), gte(contactEmails.sent_at, weekStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(eq(contactEmails.status, "bounced"), gte(contactEmails.sent_at, monthStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.opened_at), gte(contactEmails.opened_at, todayStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.opened_at), gte(contactEmails.opened_at, weekStart))),
        context.db
          .select({ value: count() })
          .from(contactEmails)
          .where(and(isNotNull(contactEmails.opened_at), gte(contactEmails.opened_at, monthStart))),
      ]);

      return {
        sentToday: sentTodayRows[0]?.value ?? 0,
        sentThisWeek: sentThisWeekRows[0]?.value ?? 0,
        sentThisMonth: sentThisMonthRows[0]?.value ?? 0,
        scheduledToday: scheduledTodayRows[0]?.value ?? 0,
        scheduledFuture: scheduledFutureRows[0]?.value ?? 0,
        totalSent: totalSentRows[0]?.value ?? 0,
        deliveredToday: deliveredTodayRows[0]?.value ?? 0,
        deliveredThisWeek: deliveredThisWeekRows[0]?.value ?? 0,
        deliveredThisMonth: deliveredThisMonthRows[0]?.value ?? 0,
        bouncedToday: bouncedTodayRows[0]?.value ?? 0,
        bouncedThisWeek: bouncedThisWeekRows[0]?.value ?? 0,
        bouncedThisMonth: bouncedThisMonthRows[0]?.value ?? 0,
        openedToday: openedTodayRows[0]?.value ?? 0,
        openedThisWeek: openedThisWeekRows[0]?.value ?? 0,
        openedThisMonth: openedThisMonthRows[0]?.value ?? 0,
      };
    },
  },

  Mutation: {
    async createDraftCampaign(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { name, companyId, fromEmail, replyTo, mode, sequence, delayDays, recipientEmails } = args.input;
      const id = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const rows = await context.db
        .insert(emailCampaigns)
        .values({
          id,
          name,
          company_id: companyId ?? null,
          from_email: fromEmail ?? null,
          reply_to: replyTo ?? null,
          mode: mode ?? "sequential",
          sequence: sequence ? JSON.stringify(sequence) : null,
          delay_days: delayDays ? JSON.stringify(delayDays) : null,
          recipient_emails: recipientEmails ? JSON.stringify(recipientEmails) : "[]",
          total_recipients: recipientEmails?.length ?? 0,
        })
        .returning();
      return mapCampaign(rows[0]);
    },

    async updateCampaign(
      _parent: unknown,
      args: { id: string; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { fromEmail, replyTo, sequence, delayDays, startAt, recipientEmails, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (fromEmail !== undefined) patch.from_email = fromEmail;
      if (replyTo !== undefined) patch.reply_to = replyTo;
      if (sequence !== undefined) patch.sequence = JSON.stringify(sequence);
      if (delayDays !== undefined) patch.delay_days = JSON.stringify(delayDays);
      if (startAt !== undefined) patch.start_at = startAt;
      if (recipientEmails !== undefined) {
        patch.recipient_emails = JSON.stringify(recipientEmails);
        patch.total_recipients = recipientEmails.length;
      }
      patch.updated_at = new Date().toISOString();

      const rows = await context.db
        .update(emailCampaigns)
        .set(patch)
        .where(eq(emailCampaigns.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Campaign not found");
      return mapCampaign(rows[0]);
    },

    async deleteCampaign(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(emailCampaigns).where(eq(emailCampaigns.id, args.id));
      return { success: true, message: "Campaign deleted" };
    },

    async launchEmailCampaign(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const rows = await context.db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, args.id))
        .limit(1);
      if (!rows[0]) throw new Error("Campaign not found");

      const campaign = rows[0];
      if (campaign.status !== "draft" && campaign.status !== "pending") {
        throw new Error(`Campaign is already ${campaign.status}`);
      }

      const recipients = parseJsonArray(campaign.recipient_emails);
      const sequence: Array<{ subject: string; html: string; text?: string }> = campaign.sequence
        ? JSON.parse(campaign.sequence)
        : [];
      const delayDays: number[] = campaign.delay_days ? JSON.parse(campaign.delay_days) : [];

      if (recipients.length === 0) {
        throw new Error("Campaign has no recipients");
      }
      if (sequence.length === 0) {
        throw new Error("Campaign has no email sequence");
      }

      let sent = 0;
      let scheduled = 0;
      let failed = 0;

      for (const recipientEmail of recipients) {
        for (let stepIdx = 0; stepIdx < sequence.length; stepIdx++) {
          const step = sequence[stepIdx];
          const delay = stepIdx > 0 ? (delayDays[stepIdx - 1] ?? stepIdx) : 0;

          let scheduledAt: string | undefined;
          if (delay > 0) {
            const sendDate = new Date();
            sendDate.setDate(sendDate.getDate() + delay);
            scheduledAt = sendDate.toISOString();
          }

          const result = await resend.instance.send({
            to: recipientEmail,
            subject: step.subject,
            html: step.html,
            text: step.text,
            from: campaign.from_email ?? undefined,
            replyTo: campaign.reply_to ?? undefined,
            scheduledAt,
          });

          if (result.error) {
            failed++;
          } else if (scheduledAt) {
            scheduled++;
          } else {
            sent++;
          }
        }
      }

      const updatedRows = await context.db
        .update(emailCampaigns)
        .set({
          status: failed === recipients.length * sequence.length ? "failed" : "running",
          emails_sent: sent,
          emails_scheduled: scheduled,
          emails_failed: failed,
          start_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where(eq(emailCampaigns.id, args.id))
        .returning();

      return mapCampaign(updatedRows[0]);
    },

    async sendEmail(
      _parent: unknown,
      args: { input: { to: string; subject: string; html: string; text?: string; replyTo?: string; from?: string; scheduledAt?: string } },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { to, subject, html, text, replyTo, from, scheduledAt } = args.input;
      const result = await resend.instance.send({
        to,
        subject,
        html,
        text: text ?? undefined,
        replyTo: replyTo ?? undefined,
        from: from ?? undefined,
        scheduledAt: scheduledAt ?? undefined,
      });

      return {
        success: !result.error,
        id: result.id || null,
        error: result.error || null,
      };
    },

    async generateEmail(
      _parent: unknown,
      args: { input: { recipientName: string; recipientRole?: string; companyName?: string; purpose: string; tone?: string; templateId?: number } },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { recipientName, recipientRole, companyName, purpose, tone, templateId } = args.input;

      let templateContext = "";
      if (templateId) {
        const tmplRows = await context.db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, templateId))
          .limit(1);
        if (tmplRows[0]) {
          templateContext = `\n\nUse this template as a starting point:\nSubject: ${tmplRows[0].subject ?? ""}\nBody: ${tmplRows[0].text_content ?? tmplRows[0].html_content ?? ""}`;
        }
      }

      const prompt = `Write a professional email with the following details:
- Recipient: ${recipientName}${recipientRole ? `, ${recipientRole}` : ""}${companyName ? ` at ${companyName}` : ""}
- Purpose: ${purpose}
- Tone: ${tone ?? "professional and friendly"}${templateContext}

Return ONLY a JSON object with exactly these fields:
- "subject": the email subject line
- "text": the plain text body
- "html": the HTML version of the body (use <p> tags for paragraphs)

Do not include any text before or after the JSON.`;

      const result = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        prompt,
        maxTokens: 1500,
      });

      let parsed: { subject: string; text: string; html: string };
      try {
        parsed = JSON.parse(result.text);
      } catch {
        const text = result.text.trim();
        parsed = {
          subject: `Email to ${recipientName}`,
          text,
          html: text.split("\n\n").map((p) => `<p>${p}</p>`).join("\n"),
        };
      }

      return {
        subject: parsed.subject,
        html: parsed.html,
        text: parsed.text,
      };
    },

    async scheduleBatchEmails(
      _parent: unknown,
      args: {
        input: {
          recipients: Array<{ email: string; name: string; contactId?: number; companyId?: number }>;
          subject: string;
          body: string;
          useScheduler?: boolean;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { recipients, subject, body, useScheduler } = args.input;

      if (recipients.length === 0) {
        return { success: false, message: "No recipients", scheduled: 0, failed: 0 };
      }

      const emailsToSchedule = recipients.map((r) => {
        const personalized = personalizeEmailBody(body, r.name);
        const html = textToStructuredHtml(personalized);
        return {
          contactId: r.contactId ?? 0,
          companyId: r.companyId,
          email: r.email,
          subject,
          htmlBody: html,
          textBody: personalized,
          firstName: r.name.split(" ")[0] || r.name,
          lastName: r.name.split(" ").slice(1).join(" ") || "",
        };
      });

      if (useScheduler) {
        const schedule = buildSchedule(emailsToSchedule);
        const preview = getSchedulePreview(recipients.length);
        let scheduled = 0;
        let failed = 0;

        for (const entry of schedule) {
          const bounced = await isEmailBounced(entry.email);
          if (bounced.isBounced) { failed++; continue; }

          const result = await resend.instance.send({
            to: entry.email,
            subject: entry.subject,
            html: entry.htmlBody,
            from: EmailConfig.SENDER,
            replyTo: EmailConfig.SENDER_EMAIL,
            scheduledAt: entry.scheduledAt.toISOString(),
          });

          if (result.error) { failed++; } else { scheduled++; }
        }

        return {
          success: failed === 0,
          message: `Scheduled ${scheduled} emails across ${preview.daysUsed} business days`,
          scheduled,
          failed,
          firstSendDate: preview.firstSendDate?.toISOString() ?? null,
          lastSendDate: preview.lastSendDate?.toISOString() ?? null,
          schedulingPlan: preview.description,
        };
      }

      // Default: schedule 10 min from now
      const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      let scheduled = 0;
      let failed = 0;

      for (const e of emailsToSchedule) {
        const bounced = await isEmailBounced(e.email);
        if (bounced.isBounced) { failed++; continue; }

        const result = await resend.instance.send({
          to: e.email,
          subject: e.subject,
          html: e.htmlBody,
          from: EmailConfig.SENDER,
          replyTo: EmailConfig.SENDER_EMAIL,
          scheduledAt,
        });

        if (result.error) { failed++; } else { scheduled++; }
      }

      return {
        success: failed === 0,
        message: `Scheduled ${scheduled} emails for ${new Date(scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`,
        scheduled,
        failed,
      };
    },

    async scheduleFollowUpBatch(
      _parent: unknown,
      args: {
        input: {
          companyId: number;
          daysAfter: number;
          sequenceNumber: string;
          customSubject?: string;
          customInstructions?: string;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { companyId, daysAfter, sequenceNumber, customSubject, customInstructions } = args.input;
      const seqNum = parseInt(sequenceNumber, 10);
      if (isNaN(seqNum) || seqNum < 1) {
        return { success: false, message: "Invalid sequence number", contactCount: 0, emailIds: [] };
      }

      const previousSequence = seqNum - 1;

      // Find emails from previous sequence needing follow-up
      const sentEmails = await context.db
        .select()
        .from(contactEmails)
        .where(
          and(
            eq(contactEmails.company_id, companyId),
            eq(contactEmails.sequence_number, previousSequence.toString()),
            or(
              eq(contactEmails.status, "sent"),
              eq(contactEmails.status, "delivered"),
              eq(contactEmails.status, "opened"),
            ),
            eq(contactEmails.reply_received, false),
          ),
        );

      if (sentEmails.length === 0) {
        return { success: false, message: `No emails from sequence ${previousSequence} need follow-up`, contactCount: 0, emailIds: [] };
      }

      // For now, return the count — actual follow-up content generation can be wired to DeepSeek
      const instructions = buildFollowUpInstructions(
        sequenceNumber,
        daysAfter,
        sentEmails[0]?.subject ?? "Previous outreach",
        customInstructions,
      );

      return {
        success: true,
        message: `Found ${sentEmails.length} emails needing follow-up #${sequenceNumber}. Use the instructions to generate follow-up content.`,
        contactCount: sentEmails.length,
        emailIds: sentEmails.map((e) => e.resend_id),
      };
    },

    async markEmailReplied(
      _parent: unknown,
      args: { resendId: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const success = await markReplied(args.resendId);
      return {
        success,
        message: success ? "Email marked as replied" : "Failed to mark email as replied",
      };
    },

    async syncResendEmails(
      _parent: unknown,
      args: { companyId?: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const conditions = [
        or(
          eq(contactEmails.status, "sent"),
          eq(contactEmails.status, "delivered"),
          eq(contactEmails.status, "scheduled"),
        ),
      ];
      if (args.companyId) {
        conditions.push(eq(contactEmails.company_id, args.companyId));
      }

      const sentEmails = await context.db
        .select()
        .from(contactEmails)
        .where(and(...conditions));

      let updatedCount = 0;
      let skippedCount = 0;

      const isValidUUID = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      for (const email of sentEmails) {
        try {
          if (!isValidUUID(email.resend_id)) { skippedCount++; continue; }

          const detail = await resend.instance.getEmail(email.resend_id);
          if (!detail) { skippedCount++; continue; }

          let newStatus = "sent";
          if (detail.last_event === "bounced" || detail.last_event === "complained") {
            newStatus = detail.last_event;
          } else if (["delivered", "opened", "clicked"].includes(detail.last_event)) {
            newStatus = "delivered";
          }

          if (email.status !== newStatus) {
            await context.db
              .update(contactEmails)
              .set({
                status: newStatus,
                delivered_at: ["delivered", "opened", "clicked"].includes(detail.last_event)
                  ? new Date().toISOString()
                  : email.delivered_at,
                opened_at: ["opened", "clicked"].includes(detail.last_event)
                  ? new Date().toISOString()
                  : email.opened_at,
              })
              .where(eq(contactEmails.resend_id, email.resend_id));

            updatedCount++;

            // If bounced, update contact's bounced_emails
            if (newStatus === "bounced") {
              try {
                const toEmails: string[] = JSON.parse(email.to_emails);
                const bouncedEmail = toEmails[0];
                if (bouncedEmail) {
                  const [contact] = await context.db
                    .select()
                    .from(contacts)
                    .where(eq(contacts.id, email.contact_id))
                    .limit(1);
                  if (contact) {
                    const currentBounced: string[] = contact.bounced_emails
                      ? JSON.parse(contact.bounced_emails)
                      : [];
                    if (!currentBounced.includes(bouncedEmail)) {
                      await context.db
                        .update(contacts)
                        .set({
                          bounced_emails: JSON.stringify([...currentBounced, bouncedEmail]),
                          updated_at: new Date().toISOString(),
                        })
                        .where(eq(contacts.id, email.contact_id));
                    }
                  }
                }
              } catch {}
            }
          } else {
            skippedCount++;
          }

          // Rate limit: 500ms between Resend API calls
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          skippedCount++;
        }
      }

      return {
        success: true,
        updatedCount,
        skippedCount,
        totalCount: sentEmails.length,
        error: null,
      };
    },

    async sendScheduledEmailNow(
      _parent: unknown,
      args: { resendId: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const [email] = await context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.resend_id, args.resendId))
        .limit(1);

      if (!email) return { success: false, resendId: null, error: "Email not found" };
      if (email.status !== "scheduled") {
        return { success: false, resendId: null, error: `Email status is ${email.status}, not scheduled` };
      }

      const sendNowTime = addMinutes(new Date(), 1).toISOString();
      const result = await resend.instance.update(args.resendId, sendNowTime);

      if (!result.success) {
        return { success: false, resendId: null, error: result.error || "Failed to update schedule" };
      }

      await context.db
        .update(contactEmails)
        .set({ scheduled_at: sendNowTime, updated_at: new Date().toISOString() })
        .where(eq(contactEmails.resend_id, args.resendId));

      return { success: true, resendId: args.resendId, error: null };
    },

    async cancelScheduledEmail(
      _parent: unknown,
      args: { resendId: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const result = await resend.instance.cancel(args.resendId);
      if (!result.success) {
        return { success: false, error: result.error || "Failed to cancel" };
      }

      await context.db
        .update(contactEmails)
        .set({ status: "cancelled", updated_at: new Date().toISOString() })
        .where(eq(contactEmails.resend_id, args.resendId));

      return { success: true, error: null };
    },

    async cancelCompanyEmails(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, args.companyId));

      if (companyContacts.length === 0) {
        return { success: true, message: "No contacts found for company", cancelledCount: 0, failedCount: 0 };
      }

      const contactIds = companyContacts.map((c) => c.id);

      const scheduledEmails = await context.db
        .select()
        .from(contactEmails)
        .where(
          and(
            inArray(contactEmails.contact_id, contactIds),
            eq(contactEmails.status, "scheduled"),
          ),
        );

      if (scheduledEmails.length === 0) {
        return { success: true, message: "No scheduled emails found for company", cancelledCount: 0, failedCount: 0 };
      }

      let cancelledCount = 0;
      let failedCount = 0;

      for (const email of scheduledEmails) {
        try {
          const result = await resend.instance.cancel(email.resend_id);
          if (result.success) {
            await context.db
              .update(contactEmails)
              .set({ status: "cancelled", updated_at: new Date().toISOString() })
              .where(eq(contactEmails.resend_id, email.resend_id));
            cancelledCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      return {
        success: failedCount === 0,
        message: `Cancelled ${cancelledCount} email(s)${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        cancelledCount,
        failedCount,
      };
    },

    async generateReply(
      _parent: unknown,
      args: {
        input: {
          originalEmailContent: string;
          originalSender: string;
          additionalDetails?: string;
          tone?: string;
          replyType?: string;
          includeCalendly?: boolean;
          replyTo?: string;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const {
        originalEmailContent,
        originalSender,
        additionalDetails,
        tone,
        replyType,
        includeCalendly,
        replyTo,
      } = args.input;

      const result = await generateReplyContent({
        originalEmailContent,
        originalSender,
        additionalDetails,
        tone,
        replyType,
        includeCalendly,
        replyTo,
      });

      return {
        subject: result.subject,
        body: result.body,
      };
    },
  },
};
