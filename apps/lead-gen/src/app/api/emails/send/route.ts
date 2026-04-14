import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactEmails, receivedEmails } from "@/db/schema";
import { RESUME_PDF_PACKAGE_PATH } from "@ai-apps/resume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = "Vadim Nicolai <contact@vadim.blog>";
const RESUME_PATH = join(process.cwd(), RESUME_PDF_PACKAGE_PATH);

interface SendEmailRequest {
  contactId: number;
  to: string;
  name: string;
  subject: string;
  body: string;
  includeResume?: boolean;
  receivedEmailId?: number;
  scheduledAt?: string;
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("<br>");
      return lines ? `<p>${lines}</p>` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  if (!isAdminEmail(userEmail)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Start resume file read immediately (parallelized with JSON parsing)
  const resumeReadPromise = readFile(RESUME_PATH).catch(() => null);

  let input: SendEmailRequest;
  try {
    input = (await request.json()) as SendEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { contactId, to, name, subject, body, includeResume, receivedEmailId, scheduledAt } = input;

  if (!to || !subject || !body) {
    return NextResponse.json({ success: false, error: "to, subject, and body are required" }, { status: 400 });
  }

  const firstName = (name || "").split(" ")[0] || name || "";
  const personalized = body.replace(/\{\{name\}\}/g, firstName);
  const html = textToHtml(personalized);

  const attachments = [];
  if (includeResume) {
    const content = await resumeReadPromise;
    if (!content) {
      return NextResponse.json({ success: false, error: "Resume file not found" }, { status: 500 });
    }
    attachments.push({ filename: "Vadim_Nicolai_CV.pdf", content });
  }

  // Build threading headers for replies (In-Reply-To + References)
  const threadHeaders: Record<string, string> = {};
  if (receivedEmailId) {
    try {
      const [received] = await db
        .select({ message_id: receivedEmails.message_id })
        .from(receivedEmails)
        .where(eq(receivedEmails.id, receivedEmailId))
        .limit(1);
      if (received?.message_id) {
        threadHeaders["In-Reply-To"] = received.message_id;
        threadHeaders["References"] = received.message_id;
      }
    } catch {
      // Non-critical — email will still send, just won't thread
    }
  }

  let result: Awaited<ReturnType<typeof resend.instance.send>>;
  try {
    result = await resend.instance.send({
      from: FROM,
      to,
      subject: subject.trim(),
      html,
      text: personalized,
      ...(attachments.length > 0 && { attachments }),
      ...(scheduledAt && { scheduledAt }),
      ...(Object.keys(threadHeaders).length > 0 && { headers: threadHeaders }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[send] resend.send threw:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  // Persist to DB if contactId provided
  const isScheduled = !!scheduledAt;
  if (contactId) {
    try {
      await db.insert(contactEmails).values({
        contact_id: contactId,
        resend_id: result.id,
        from_email: FROM,
        to_emails: JSON.stringify([to]),
        subject: subject.trim(),
        text_content: personalized,
        status: isScheduled ? "scheduled" : "sent",
        ...(isScheduled
          ? { scheduled_at: scheduledAt }
          : { sent_at: new Date().toISOString() }),
        recipient_name: name || null,
        ...(receivedEmailId ? { in_reply_to_received_id: receivedEmailId } : {}),
      });
    } catch (err) {
      // Non-fatal — email was sent/scheduled, just log the persistence failure
      console.error("[send] Failed to persist contact email:", err);
    }
  }

  return NextResponse.json({ success: true, id: result.id, scheduled: isScheduled });
}
