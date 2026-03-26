import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";
import {
  isEmailBounced,
  personalizeEmailBody,
  textToStructuredHtml,
} from "@/lib/email/utils";
import { buildSchedule, getSchedulePreview } from "@/lib/email/scheduler";
import { db } from "@/db";
import { contactEmails } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 100;
const VERIFIED_FROM = "Vadim Nicolai <contact@vadim.blog>";

interface Recipient {
  email: string;
  name: string;
  contactId?: number;
  companyId?: number;
}


interface BatchEmailRequestBody {
  recipients: Recipient[];
  subject: string;
  body: string;
  scheduledAt?: string;
  /** Use business-day scheduler (distributes across Mon-Fri with random delays) */
  useScheduler?: boolean;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
  scheduledAt?: string;
  batchDay?: number;
}

interface FailedResult {
  email: string;
  error: string;
}

interface BatchEmailResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: FailedResult[];
  schedulingPlan?: string;
}

function validateScheduledAt(scheduledAt: string): string | null {
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) return "scheduledAt is not a valid date string";
  const now = new Date();
  if (scheduledDate <= now) return "scheduledAt must be a future date";
  const daysDiff = Math.ceil(
    (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff > 30) return `scheduledAt exceeds Resend's 30-day limit (${daysDiff} days)`;
  return null;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<BatchEmailResponse>> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", sent: [], failed: [] },
      { status: 401 },
    );
  }

  const userEmail = session.user.email;
  if (!isAdminEmail(userEmail)) {
    return NextResponse.json(
      { success: false, message: "Forbidden", sent: [], failed: [] },
      { status: 403 },
    );
  }

  let body: BatchEmailRequestBody;
  try {
    body = (await request.json()) as BatchEmailRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body", sent: [], failed: [] },
      { status: 400 },
    );
  }

  const { recipients, subject, body: emailBody, scheduledAt, useScheduler } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { success: false, message: "recipients array is required", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (!subject?.trim()) {
    return NextResponse.json(
      { success: false, message: "subject is required", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (!emailBody?.trim()) {
    return NextResponse.json(
      { success: false, message: "body is required", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (recipients.length > BATCH_LIMIT) {
    return NextResponse.json(
      {
        success: false,
        message: `Batch limit is ${BATCH_LIMIT} recipients (got ${recipients.length})`,
        sent: [],
        failed: [],
      },
      { status: 400 },
    );
  }

  for (const r of recipients) {
    if (!r.email || !r.name) {
      return NextResponse.json(
        { success: false, message: "Each recipient must have email and name", sent: [], failed: [] },
        { status: 400 },
      );
    }
  }

  const sent: SendResult[] = [];
  const failed: FailedResult[] = [];

  // --- Business day scheduler mode ---
  if (useScheduler) {
    const emailsToSchedule = recipients.map((r) => {
      const personalized = personalizeEmailBody(emailBody, r.name);
      const html = textToStructuredHtml(personalized);
      return {
        contactId: r.contactId ?? 0,
        email: r.email,
        subject: subject.trim(),
        htmlBody: html,
        textBody: personalized,
        firstName: r.name.split(" ")[0] || r.name,
        lastName: r.name.split(" ").slice(1).join(" ") || "",
      };
    });

    const schedule = buildSchedule(emailsToSchedule);
    const preview = getSchedulePreview(recipients.length);

    for (const entry of schedule) {
      // Check bounced
      const bounced = await isEmailBounced(entry.email);
      if (bounced.isBounced) {
        failed.push({ email: entry.email, error: "Bounced email" });
        continue;
      }

      const result = await resend.instance.send({
        from: VERIFIED_FROM,
        to: entry.email,
        subject: entry.subject,
        html: entry.htmlBody,
        scheduledAt: entry.scheduledAt.toISOString(),
      });

      if (result.error) {
        failed.push({ email: entry.email, error: String(result.error) });
      } else {
        // Find the matching recipient to get contactId/companyId
        const matchingRecipient = recipients.find((r) => r.email === entry.email);
        if (matchingRecipient?.contactId) {
          try {
              await db.insert(contactEmails).values({
              contact_id: matchingRecipient.contactId,
              company_id: matchingRecipient.companyId ?? null,
              resend_id: result.id || `batch_${Date.now()}_${entry.email}`,
              from_email: VERIFIED_FROM,
              to_emails: JSON.stringify([entry.email]),
              subject: entry.subject,
              text_content: entry.textBody,
              status: "scheduled",
              scheduled_at: entry.scheduledAt.toISOString(),
              recipient_name: `${entry.firstName} ${entry.lastName}`.trim(),
              sequence_type: "initial",
              sequence_number: "0",
            });
          } catch (dbErr) {
            console.error("Failed to persist email to DB:", dbErr);
          }
        }
        sent.push({
          email: entry.email,
          status: "sent",
          scheduledAt: entry.scheduledAt.toISOString(),
          batchDay: entry.batchDay,
        });
      }
    }

    const allSucceeded = failed.length === 0;
    return NextResponse.json(
      {
        success: allSucceeded,
        message: allSucceeded
          ? `Scheduled ${sent.length} emails across ${preview.daysUsed} business days`
          : `Scheduled ${sent.length}, failed ${failed.length}`,
        sent,
        failed,
        schedulingPlan: preview.description,
      },
      { status: allSucceeded ? 200 : 207 },
    );
  }

  // --- Fixed schedule mode (default) ---
  const effectiveScheduledAt: string =
    scheduledAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (scheduledAt !== undefined) {
    const scheduleError = validateScheduledAt(effectiveScheduledAt);
    if (scheduleError) {
      return NextResponse.json(
        { success: false, message: scheduleError, sent: [], failed: [] },
        { status: 400 },
      );
    }
  }

  for (const recipient of recipients) {
    // Check bounced
    const bounced = await isEmailBounced(recipient.email);
    if (bounced.isBounced) {
      failed.push({ email: recipient.email, error: "Bounced email — skipped" });
      continue;
    }

    const personalized = personalizeEmailBody(emailBody, recipient.name);
    const html = textToStructuredHtml(personalized);

    const result = await resend.instance.send({
      from: VERIFIED_FROM,
      to: recipient.email,
      subject: subject.trim(),
      html,
      scheduledAt: effectiveScheduledAt,
    });

    if (result.error) {
      failed.push({ email: recipient.email, error: String(result.error) });
    } else {
      if (recipient.contactId) {
        try {
          await db.insert(contactEmails).values({
            contact_id: recipient.contactId,
            company_id: recipient.companyId ?? null,
            resend_id: result.id || `batch_${Date.now()}_${recipient.email}`,
            from_email: VERIFIED_FROM,
            to_emails: JSON.stringify([recipient.email]),
            subject: subject.trim(),
            text_content: personalized,
            status: "scheduled",
            scheduled_at: effectiveScheduledAt,
            recipient_name: recipient.name,
            sequence_type: "initial",
            sequence_number: "0",
          });
        } catch (dbErr) {
          console.error("Failed to persist email to DB:", dbErr);
        }
      }
      sent.push({ email: recipient.email, status: "sent" });
    }
  }

  const allSucceeded = failed.length === 0;
  const scheduledTime = new Date(effectiveScheduledAt).toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit", timeZone: "UTC" },
  );

  return NextResponse.json(
    {
      success: allSucceeded,
      message: allSucceeded
        ? `Scheduled ${sent.length} email${sent.length === 1 ? "" : "s"} for ${scheduledTime} UTC`
        : `Scheduled ${sent.length}, failed ${failed.length}`,
      sent,
      failed,
    },
    { status: allSucceeded ? 200 : 207 },
  );
}
