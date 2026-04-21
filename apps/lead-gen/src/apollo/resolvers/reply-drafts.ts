/**
 * Reply Drafts resolvers — CRUD + batch operations for auto-generated reply drafts.
 */

import { eq, and, count, desc, sql, isNull, or } from "drizzle-orm";
import { replyDrafts, receivedEmails, contacts, companies, contactEmails } from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

const SENDER_EMAIL = "contact@vadim.blog";

export const replyDraftResolvers = {
  Query: {
    async replyDrafts(
      _parent: unknown,
      args: { status?: string; draftType?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.status)
        conditions.push(
          eq(replyDrafts.status, args.status as typeof replyDrafts.status._.data),
        );
      if (args.draftType)
        conditions.push(
          eq(
            replyDrafts.draft_type,
            args.draftType as typeof replyDrafts.draft_type._.data,
          ),
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [drafts, totalRows] = await Promise.all([
        context.db
          .select({
            id: replyDrafts.id,
            received_email_id: replyDrafts.received_email_id,
            contact_id: replyDrafts.contact_id,
            status: replyDrafts.status,
            draft_type: replyDrafts.draft_type,
            subject: replyDrafts.subject,
            body_text: replyDrafts.body_text,
            body_html: replyDrafts.body_html,
            generation_model: replyDrafts.generation_model,
            approved_at: replyDrafts.approved_at,
            sent_at: replyDrafts.sent_at,
            created_at: replyDrafts.created_at,
            updated_at: replyDrafts.updated_at,
            // Joined fields
            first_name: contacts.first_name,
            last_name: contacts.last_name,
            email: contacts.email,
            company_name: companies.name,
            classification: receivedEmails.classification,
            classification_confidence: receivedEmails.classification_confidence,
          })
          .from(replyDrafts)
          .innerJoin(contacts, eq(replyDrafts.contact_id, contacts.id))
          .leftJoin(companies, eq(contacts.company_id, companies.id))
          .innerJoin(receivedEmails, eq(replyDrafts.received_email_id, receivedEmails.id))
          .where(where)
          .orderBy(desc(replyDrafts.created_at))
          .limit(limit)
          .offset(offset),
        context.db
          .select({ count: count() })
          .from(replyDrafts)
          .where(where),
      ]);

      return {
        drafts: drafts.map((d) => ({
          id: d.id,
          receivedEmailId: d.received_email_id,
          contactId: d.contact_id,
          status: d.status,
          draftType: d.draft_type,
          subject: d.subject,
          bodyText: d.body_text,
          bodyHtml: d.body_html,
          generationModel: d.generation_model,
          contactName: `${d.first_name} ${d.last_name}`.trim(),
          contactEmail: d.email,
          companyName: d.company_name,
          classification: d.classification,
          classificationConfidence: d.classification_confidence,
          approvedAt: d.approved_at,
          sentAt: d.sent_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })),
        totalCount: totalRows[0]?.count ?? 0,
      };
    },

    async draftSummary(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const [statusCounts, classificationCounts] = await Promise.all([
        context.db
          .select({
            status: replyDrafts.status,
            count: count(),
          })
          .from(replyDrafts)
          .groupBy(replyDrafts.status),
        context.db
          .select({
            classification: receivedEmails.classification,
            count: count(),
          })
          .from(replyDrafts)
          .innerJoin(receivedEmails, eq(replyDrafts.received_email_id, receivedEmails.id))
          .where(eq(replyDrafts.status, "pending"))
          .groupBy(receivedEmails.classification),
      ]);

      const statusMap: Record<string, number> = {};
      for (const row of statusCounts) {
        statusMap[row.status] = row.count;
      }

      return {
        pending: statusMap["pending"] ?? 0,
        approved: statusMap["approved"] ?? 0,
        sent: statusMap["sent"] ?? 0,
        dismissed: statusMap["dismissed"] ?? 0,
        byClassification: classificationCounts.map((r) => ({
          classification: r.classification || "unknown",
          count: r.count,
        })),
      };
    },
  },

  Mutation: {
    async approveAndSendDraft(
      _parent: unknown,
      args: { draftId: number; editedSubject?: string; editedBody?: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      // Fetch the draft with contact info
      const [draft] = await context.db
        .select({
          id: replyDrafts.id,
          received_email_id: replyDrafts.received_email_id,
          contact_id: replyDrafts.contact_id,
          subject: replyDrafts.subject,
          body_text: replyDrafts.body_text,
          status: replyDrafts.status,
          email: contacts.email,
          first_name: contacts.first_name,
        })
        .from(replyDrafts)
        .innerJoin(contacts, eq(replyDrafts.contact_id, contacts.id))
        .where(eq(replyDrafts.id, args.draftId))
        .limit(1);

      if (!draft) throw new Error(`Draft ${args.draftId} not found`);
      if (draft.status !== "pending") throw new Error(`Draft ${args.draftId} is not pending (status: ${draft.status})`);
      if (!draft.email) throw new Error(`Contact ${draft.contact_id} has no email address`);

      const subject = args.editedSubject || draft.subject;
      const bodyText = args.editedBody || draft.body_text;

      // Send via Resend
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

      const sendPayload = {
        from: SENDER_EMAIL,
        to: [draft.email],
        subject,
        text: bodyText,
        reply_to: SENDER_EMAIL,
      };

      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        return { success: false, resendId: null, error: `Resend error: ${sendRes.status} ${errBody}` };
      }

      const sendData = await sendRes.json() as { id: string };

      // Update draft status
      await context.db
        .update(replyDrafts)
        .set({
          status: "sent",
          approved_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          sent_resend_id: sendData.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(replyDrafts.id, args.draftId));

      // Create contactEmails record for tracking
      await context.db.insert(contactEmails).values({
        contact_id: draft.contact_id,
        resend_id: sendData.id,
        from_email: SENDER_EMAIL,
        to_emails: JSON.stringify([draft.email]),
        subject,
        text_content: bodyText,
        status: "sent",
        sent_at: new Date().toISOString(),
        in_reply_to_received_id: draft.received_email_id,
        tags: JSON.stringify(["auto-draft-reply"]),
      });

      return { success: true, resendId: sendData.id, error: null };
    },

    async dismissDraft(
      _parent: unknown,
      args: { draftId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      await context.db
        .update(replyDrafts)
        .set({ status: "dismissed", updated_at: new Date().toISOString() })
        .where(eq(replyDrafts.id, args.draftId));

      return { success: true };
    },

    async regenerateDraft(
      _parent: unknown,
      args: { draftId: number; instructions?: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const [draft] = await context.db
        .select()
        .from(replyDrafts)
        .where(eq(replyDrafts.id, args.draftId))
        .limit(1);

      if (!draft) throw new Error(`Draft ${args.draftId} not found`);

      // Delete old draft and regenerate
      await context.db
        .delete(replyDrafts)
        .where(eq(replyDrafts.id, args.draftId));

      // Get the classification of the received email
      const [received] = await context.db
        .select({ classification: receivedEmails.classification })
        .from(receivedEmails)
        .where(eq(receivedEmails.id, draft.received_email_id))
        .limit(1);

      const { generateReplyDraft } = await import("@/lib/email/auto-draft");
      await generateReplyDraft(
        draft.received_email_id,
        (received?.classification as any) || "interested",
        draft.contact_id,
      );

      // Return the newly generated draft
      const [newDraft] = await context.db
        .select()
        .from(replyDrafts)
        .where(eq(replyDrafts.received_email_id, draft.received_email_id))
        .orderBy(desc(replyDrafts.created_at))
        .limit(1);

      if (!newDraft) throw new Error("Failed to regenerate draft");

      return {
        id: newDraft.id,
        receivedEmailId: newDraft.received_email_id,
        contactId: newDraft.contact_id,
        status: newDraft.status,
        draftType: newDraft.draft_type,
        subject: newDraft.subject,
        bodyText: newDraft.body_text,
        bodyHtml: newDraft.body_html,
        generationModel: newDraft.generation_model,
        approvedAt: newDraft.approved_at,
        sentAt: newDraft.sent_at,
        createdAt: newDraft.created_at,
        updatedAt: newDraft.updated_at,
      };
    },

    async generateDraftsForPending(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      // Find all interested/info_request received emails without drafts
      const pendingEmails = await context.db
        .select({
          id: receivedEmails.id,
          classification: receivedEmails.classification,
          matched_contact_id: receivedEmails.matched_contact_id,
        })
        .from(receivedEmails)
        .leftJoin(replyDrafts, eq(receivedEmails.id, replyDrafts.received_email_id))
        .where(
          and(
            or(
              eq(receivedEmails.classification, "interested"),
              eq(receivedEmails.classification, "info_request"),
            ),
            sql`${receivedEmails.matched_contact_id} IS NOT NULL`,
            isNull(replyDrafts.id),
            isNull(receivedEmails.archived_at),
          ),
        )
        .limit(50); // Process max 50 at a time

      let generated = 0;
      const skipped = 0;
      let failed = 0;

      const { generateReplyDraft } = await import("@/lib/email/auto-draft");

      // Process in batches of 5 concurrent
      for (let i = 0; i < pendingEmails.length; i += 5) {
        const batch = pendingEmails.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map((email) =>
            generateReplyDraft(
              email.id,
              email.classification as any,
              email.matched_contact_id!,
            ),
          ),
        );

        for (const result of results) {
          if (result.status === "fulfilled") generated++;
          else {
            failed++;
            console.error(`[DRAFT_BATCH] Failed:`, result.reason);
          }
        }
      }

      return {
        success: true,
        generated,
        skipped,
        failed,
        message: `Generated ${generated} drafts, ${failed} failed, ${skipped} skipped`,
      };
    },

    async generateFollowUpDrafts(
      _parent: unknown,
      args: { daysAfterInitial?: number; daysAfterFollowUp1?: number; daysAfterFollowUp2?: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const daysInitial = args.daysAfterInitial ?? 3;
      const daysF1 = args.daysAfterFollowUp1 ?? 5;
      const daysF2 = args.daysAfterFollowUp2 ?? 7;

      // Find emails needing follow-up: sent/delivered, no reply, not do_not_contact
      const cutoffInitial = new Date(Date.now() - daysInitial * 86400000).toISOString();
      const cutoffF1 = new Date(Date.now() - daysF1 * 86400000).toISOString();
      const cutoffF2 = new Date(Date.now() - daysF2 * 86400000).toISOString();

      const eligibleEmails = await context.db
        .select({
          id: contactEmails.id,
          contact_id: contactEmails.contact_id,
          subject: contactEmails.subject,
          text_content: contactEmails.text_content,
          sequence_number: contactEmails.sequence_number,
          sent_at: contactEmails.sent_at,
          do_not_contact: contacts.do_not_contact,
          conversation_stage: contacts.conversation_stage,
        })
        .from(contactEmails)
        .innerJoin(contacts, eq(contactEmails.contact_id, contacts.id))
        .where(
          and(
            eq(contactEmails.reply_received, false),
            or(
              eq(contactEmails.status, "sent"),
              eq(contactEmails.status, "delivered"),
              eq(contactEmails.status, "opened"),
            ),
            or(
              eq(contactEmails.followup_status, "pending"),
              isNull(contactEmails.followup_status),
            ),
            eq(contacts.do_not_contact, false),
          ),
        )
        .limit(100);

      // Filter by timing based on sequence number
      const needsFollowUp = eligibleEmails.filter((e) => {
        const sentAt = e.sent_at || "";
        const seqNum = parseInt(e.sequence_number || "0", 10);
        const stage = e.conversation_stage;

        // Skip if already in a reply state
        if (stage && stage.startsWith("replied_")) return false;
        if (stage === "closed" || stage === "converted" || stage === "meeting_scheduled") return false;

        if (seqNum === 0 && sentAt < cutoffInitial) return true;
        if (seqNum === 1 && sentAt < cutoffF1) return true;
        if (seqNum === 2 && sentAt < cutoffF2) return true;
        return false;
      });

      let generated = 0;
      let skipped = 0;
      let failed = 0;

      // For each eligible email, check if a follow-up draft already exists
      for (const email of needsFollowUp) {
        // Check for existing draft
        const [existingDraft] = await context.db
          .select({ id: replyDrafts.id })
          .from(replyDrafts)
          .where(
            and(
              eq(replyDrafts.contact_id, email.contact_id),
              eq(replyDrafts.draft_type, "follow_up"),
              eq(replyDrafts.status, "pending"),
            ),
          )
          .limit(1);

        if (existingDraft) {
          skipped++;
          continue;
        }

        // Create a synthetic "received email" entry isn't needed — instead,
        // we'll use the last received email or create a follow-up draft directly
        const seqNum = parseInt(email.sequence_number || "0", 10);
        const nextSeq = seqNum + 1;
        if (nextSeq > 3) {
          skipped++;
          continue;
        }

        try {
          // Build follow-up instructions
          const { buildFollowUpInstructions } = await import("@/lib/email/followup");
          const daysSince = Math.floor(
            (Date.now() - new Date(email.sent_at || "").getTime()) / 86400000,
          );
          const instructions = buildFollowUpInstructions(
            nextSeq.toString(),
            daysSince,
            email.subject,
          );

          // Generate draft using DeepSeek
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY!,
            baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
          });

          const [contact] = await context.db
            .select({ first_name: contacts.first_name })
            .from(contacts)
            .where(eq(contacts.id, email.contact_id))
            .limit(1);

          const res = await client.chat.completions.create({
            model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
            messages: [
              {
                role: "user",
                content: `You are Vadim Nicolai writing a follow-up email to ${contact?.first_name || "there"}.

${instructions}

Original email subject: ${email.subject}
Original email body: ${email.text_content?.slice(0, 500) || ""}

Write the follow-up body only. Sign off with just "Vadim".
Respond with ONLY valid JSON: {"subject": "Re: ...", "body": "..."}`,
              },
            ],
            response_format: { type: "json_object" } as any,
            temperature: 0.7,
            max_tokens: 512,
          });

          const content = res.choices?.[0]?.message?.content ?? "";
          const parsed = JSON.parse(content) as { subject: string; body: string };

          const bodyWithGreeting = `Hi ${contact?.first_name || "there"},\n\n${parsed.body}`;

          // We need a received_email_id for the FK — use the most recent inbound for this contact, or create a placeholder
          const [latestInbound] = await context.db
            .select({ id: receivedEmails.id })
            .from(receivedEmails)
            .where(eq(receivedEmails.matched_contact_id, email.contact_id))
            .orderBy(desc(receivedEmails.received_at))
            .limit(1);

          if (!latestInbound) {
            // No inbound email to reference — skip this contact for follow-up drafts
            skipped++;
            continue;
          }

          await context.db.insert(replyDrafts).values({
            received_email_id: latestInbound.id,
            contact_id: email.contact_id,
            status: "pending",
            draft_type: "follow_up",
            subject: parsed.subject,
            body_text: bodyWithGreeting,
            generation_model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
          });

          generated++;
        } catch (err) {
          failed++;
          console.error(`[FOLLOWUP_DRAFTS] Failed for contact ${email.contact_id}:`, err);
        }
      }

      return {
        success: true,
        generated,
        skipped,
        failed,
        message: `Generated ${generated} follow-up drafts, ${failed} failed, ${skipped} skipped`,
      };
    },

    async approveAllDrafts(
      _parent: unknown,
      args: { draftIds: number[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process sequentially with 2-second delay between sends to respect rate limits
      for (const draftId of args.draftIds) {
        try {
          const result = await replyDraftResolvers.Mutation.approveAndSendDraft(
            _parent,
            { draftId },
            context,
          );
          if (result.success) {
            sent++;
          } else {
            failed++;
            errors.push(`Draft ${draftId}: ${result.error}`);
          }

          // Small delay between sends
          if (args.draftIds.indexOf(draftId) < args.draftIds.length - 1) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Draft ${draftId}: ${msg}`);
        }
      }

      return { success: failed === 0, sent, failed, errors };
    },

    async dismissAllDrafts(
      _parent: unknown,
      args: { draftIds: number[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      for (const draftId of args.draftIds) {
        await context.db
          .update(replyDrafts)
          .set({ status: "dismissed", updated_at: new Date().toISOString() })
          .where(eq(replyDrafts.id, draftId));
      }

      return { success: true, dismissed: args.draftIds.length };
    },
  },
};
