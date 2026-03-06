import { emailCampaigns, emailTemplates } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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
  },
};
