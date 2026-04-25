/**
 * Automated follow-up scheduler cron route.
 *
 * Runs daily to find contacts that need follow-up and generates
 * draft replies for user approval. Does NOT auto-send.
 */

import { NextResponse } from "next/server";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { contactEmails, contacts, replyDrafts, receivedEmails } from "@/db/schema";
import { buildFollowUpInstructions } from "@/lib/email/followup";
import { getDeepSeekClient, getDeepSeekModel } from "@/lib/deepseek/client";

const CRON_SECRET = process.env.CRON_SECRET;

// Default timing: days after send before follow-up
const DAYS_AFTER_INITIAL = 3;
const DAYS_AFTER_FOLLOWUP_1 = 5;
const DAYS_AFTER_FOLLOWUP_2 = 7;

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoffInitial = new Date(Date.now() - DAYS_AFTER_INITIAL * 86400000).toISOString();
  const cutoffF1 = new Date(Date.now() - DAYS_AFTER_FOLLOWUP_1 * 86400000).toISOString();
  const cutoffF2 = new Date(Date.now() - DAYS_AFTER_FOLLOWUP_2 * 86400000).toISOString();

  // Find emails needing follow-up
  const eligibleEmails = await db
    .select({
      id: contactEmails.id,
      contact_id: contactEmails.contact_id,
      subject: contactEmails.subject,
      text_content: contactEmails.text_content,
      sequence_number: contactEmails.sequence_number,
      sent_at: contactEmails.sent_at,
      first_name: contacts.first_name,
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

  // Filter by timing and conversation stage
  const needsFollowUp = eligibleEmails.filter((e) => {
    const sentAt = e.sent_at || "";
    const seqNum = parseInt(e.sequence_number || "0", 10);
    const stage = e.conversation_stage;

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

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not set" }, { status: 500 });
  }

  const client = getDeepSeekClient();
  const model = getDeepSeekModel();

  for (const email of needsFollowUp) {
    // Check for existing pending draft
    const [existingDraft] = await db
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

    const seqNum = parseInt(email.sequence_number || "0", 10);
    if (seqNum >= 3) {
      skipped++;
      continue;
    }

    try {
      const daysSince = Math.floor(
        (Date.now() - new Date(email.sent_at || "").getTime()) / 86400000,
      );
      const instructions = buildFollowUpInstructions(
        (seqNum + 1).toString(),
        daysSince,
        email.subject,
      );

      const res = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: `You are Vadim Nicolai writing a follow-up email to ${email.first_name || "there"}.

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
      const bodyWithGreeting = `Hi ${email.first_name || "there"},\n\n${parsed.body}`;

      // Find an inbound email to reference (FK constraint)
      const [latestInbound] = await db
        .select({ id: receivedEmails.id })
        .from(receivedEmails)
        .where(eq(receivedEmails.matched_contact_id, email.contact_id))
        .orderBy(desc(receivedEmails.received_at))
        .limit(1);

      if (!latestInbound) {
        skipped++;
        continue;
      }

      await db.insert(replyDrafts).values({
        received_email_id: latestInbound.id,
        contact_id: email.contact_id,
        status: "pending",
        draft_type: "follow_up",
        subject: parsed.subject,
        body_text: bodyWithGreeting,
        generation_model: model,
      });

      generated++;
    } catch (err) {
      failed++;
      console.error(`[FOLLOWUP_CRON] Failed for contact ${email.contact_id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    eligible: needsFollowUp.length,
    generated,
    skipped,
    failed,
  });
}
