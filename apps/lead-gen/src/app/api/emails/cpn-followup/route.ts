import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/db";
import { contacts, contactEmails, receivedEmails } from "@/db/schema";
import { eq, like, and, desc } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { stripQuotedText } from "@/lib/email/reply-classifier";
import {
  buildCpnFollowup,
  DECLINE_PATTERNS,
  CPN_TAG,
  CPN_FOLLOWUP_TAGS,
  FROM,
  STATUS_ORDER,
  type CpnFollowupStatus,
} from "@/lib/email/cpn-followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CpnThread {
  contactId: number;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string | null;
  status: CpnFollowupStatus;
  replyCount: number;
  latestReplyPreview: string;
  outboundIds: number[];
}

// ── GET — list contacts needing CPN followup ─────────────────────

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find contacts with CPN outreach emails tagged needs_response
  const needsResponse = await db
    .selectDistinctOn([contacts.email], {
      contactId: contacts.id,
      firstName: contacts.first_name,
      lastName: contacts.last_name,
      email: contacts.email,
      company: contacts.company,
    })
    .from(contactEmails)
    .innerJoin(contacts, eq(contacts.id, contactEmails.contact_id))
    .where(
      and(
        like(contactEmails.tags, "%needs_response%"),
        like(contactEmails.tags, "%cpn-outreach%"),
      ),
    )
    .orderBy(contacts.email, contacts.first_name);

  const threads: CpnThread[] = [];

  for (const c of needsResponse) {
    if (!c.email) continue;

    // All outbound CPN emails to this contact
    const outbounds = await db
      .select({ id: contactEmails.id, tags: contactEmails.tags, sent_at: contactEmails.sent_at })
      .from(contactEmails)
      .where(
        and(
          eq(contactEmails.contact_id, c.contactId),
          like(contactEmails.tags, "%cpn-outreach%"),
        ),
      )
      .orderBy(contactEmails.id);

    // Check if followup already sent
    const followups = await db
      .select({ id: contactEmails.id, sent_at: contactEmails.sent_at })
      .from(contactEmails)
      .where(
        and(
          eq(contactEmails.contact_id, c.contactId),
          like(contactEmails.tags, "%cpn-followup%"),
          eq(contactEmails.status, "sent"),
        ),
      )
      .orderBy(desc(contactEmails.sent_at))
      .limit(1);
    const hasFollowup = followups.length > 0;

    // All replies from this contact
    const replies = await db
      .select({
        text_content: receivedEmails.text_content,
        html_content: receivedEmails.html_content,
        received_at: receivedEmails.received_at,
      })
      .from(receivedEmails)
      .where(eq(receivedEmails.matched_contact_id, c.contactId))
      .orderBy(receivedEmails.received_at);

    // Skip if followup already sent and no new replies after it
    if (hasFollowup && replies.length > 0) {
      const followupTime = new Date(followups[0].sent_at!).getTime();
      const latestReplyTime = new Date(replies[replies.length - 1].received_at).getTime();
      if (latestReplyTime < followupTime) continue;
    }

    // Get latest reply text for status determination
    const latestReply = replies.length > 0 ? replies[replies.length - 1] : null;
    const latestText = latestReply
      ? latestReply.text_content || latestReply.html_content?.replace(/<[^>]+>/g, "") || ""
      : "";
    const strippedText = stripQuotedText(latestText).toLowerCase();

    // Determine status
    let status: CpnFollowupStatus = "ready";
    if (DECLINE_PATTERNS.some((p) => strippedText.includes(p))) {
      status = "declined";
    } else if (hasFollowup) {
      status = "already_replied_to_followup";
    } else if ((strippedText.match(/\?/g) || []).length >= 2) {
      status = "has_questions";
    }

    threads.push({
      contactId: c.contactId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      company: c.company,
      status,
      replyCount: replies.length,
      latestReplyPreview: strippedText.slice(0, 200),
      outboundIds: outbounds.map((o) => o.id),
    });
  }

  // Sort: ready first, then questions, then already replied, then declined
  threads.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.firstName.localeCompare(b.firstName),
  );

  const counts = { ready: 0, has_questions: 0, already_replied_to_followup: 0, declined: 0 };
  for (const t of threads) counts[t.status]++;

  return NextResponse.json({ threads, counts });
}

// ── POST — send CPN followups ────────────────────────────────────

interface SendRequest {
  contactIds?: number[];
  sendAll?: boolean;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as SendRequest;

  // Re-fetch threads to get current state
  const getResponse = await GET(request);
  const { threads } = (await getResponse.json()) as { threads: CpnThread[] };

  // Filter to only "ready" contacts
  let toSend = threads.filter((t) => t.status === "ready");

  if (body.contactIds && !body.sendAll) {
    const ids = new Set(body.contactIds);
    toSend = toSend.filter((t) => ids.has(t.contactId));
  }

  const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];
  let sent = 0;
  let failed = 0;

  for (const thread of toSend) {
    const name = `${thread.firstName} ${thread.lastName ?? ""}`.trim();
    const { subject, text } = buildCpnFollowup(thread.firstName);

    try {
      const result = await resend.instance.send({
        from: FROM,
        to: thread.email,
        subject,
        text,
      });

      if (result.error) {
        failed++;
        results.push({ email: thread.email, status: "failed", error: String(result.error) });
        continue;
      }

      // Insert followup email record
      await db.insert(contactEmails).values({
        contact_id: thread.contactId,
        resend_id: result.id,
        from_email: "contact@vadim.blog",
        to_emails: JSON.stringify([thread.email]),
        subject,
        text_content: text,
        status: "sent",
        sent_at: new Date().toISOString(),
        tags: CPN_FOLLOWUP_TAGS,
        recipient_name: name,
        parent_email_id: thread.outboundIds[0],
        sequence_type: "followup_1",
        sequence_number: "1",
      });

      // Mark original outbound emails as handled
      for (const oid of thread.outboundIds) {
        await db
          .update(contactEmails)
          .set({
            tags: CPN_TAG,
            followup_status: "completed",
            updated_at: new Date().toISOString(),
          })
          .where(eq(contactEmails.id, oid));
      }

      sent++;
      results.push({ email: thread.email, status: "sent" });
    } catch (err) {
      failed++;
      results.push({
        email: thread.email,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ sent, failed, results });
}
