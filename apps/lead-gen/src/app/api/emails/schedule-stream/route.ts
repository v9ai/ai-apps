import { NextRequest } from "next/server";
import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { contacts, companies } from "@/db/schema";
import { sendAndSaveEmail } from "@/lib/email/utils";
import { personalizeEmailBody, textToHtml } from "@/lib/email/utils";
import { getVadimSignature } from "@/lib/email/signature";
import { getRandomEmailSubject } from "@/lib/email/subjects";
import {
  addBusinessDays,
  setHours,
  setMinutes,
  addMinutes,
} from "date-fns";

export const maxDuration = 120;


/**
 * Get next business day at ~8am UTC with random 0-120 min offset.
 */
function getNextBusinessDay(baseDate: Date, dayOffset: number): Date {
  let date = addBusinessDays(baseDate, dayOffset);
  date = setHours(date, 8);
  date = setMinutes(date, 0);
  date = addMinutes(date, Math.floor(Math.random() * 120));
  return date;
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function send(type: string, data: Record<string, unknown>) {
    if (controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`),
      );
    }
  }

  function close() {
    if (controller) {
      controller.close();
    }
  }

  return { stream, send, close };
}

export async function POST(request: NextRequest) {
  const { companyId } = await request.json();

  if (!companyId) {
    return new Response("Missing companyId", { status: 400 });
  }

  const { stream, send, close } = createSSEStream();

  // Process in the background while streaming
  (async () => {
    try {

      // Get company
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        send("error", { message: "Company not found" });
        close();
        return;
      }

      send("progress", {
        stage: "init",
        message: `Found company: ${company.name}`,
      });

      // Get contacts with verified emails
      const companyContacts = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.company_id, companyId),
            isNotNull(contacts.email),
          ),
        );

      const validContacts = companyContacts.filter(
        (c) => c.email && c.email.trim().length > 0,
      );

      if (validContacts.length === 0) {
        send("error", { message: "No contacts with emails found" });
        close();
        return;
      }

      send("progress", {
        stage: "contacts",
        message: `Found ${validContacts.length} contacts with emails`,
        total: validContacts.length,
      });

      // Pre-render signature once (async)
      const signature = await getVadimSignature();

      const now = new Date();
      let successCount = 0;
      let errorCount = 0;
      const emailIds: string[] = [];
      // Spread across business days: max 5 per day
      const emailsPerDay = Math.min(5, validContacts.length);
      let dayOffset = 0;
      let emailsScheduledToday = 0;

      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i];
        const firstName = contact.first_name || "there";
        const subject = getRandomEmailSubject();

        // Calculate schedule time — spread across business days
        if (emailsScheduledToday >= emailsPerDay) {
          dayOffset++;
          emailsScheduledToday = 0;
        }
        const scheduledAt = getNextBusinessDay(now, dayOffset + 1);
        emailsScheduledToday++;

        send("progress", {
          stage: "scheduling",
          current: i + 1,
          total: validContacts.length,
          contact: {
            email: contact.email!,
            name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
            subject,
          },
          message: `Scheduling email ${i + 1}/${validContacts.length}: ${contact.email}`,
        });

        try {
          // Build personalized email body
          const bodyTemplate = `I came across ${company.name} and was impressed by what you're building.\n\nI'm a Senior Frontend Engineer with 10+ years of experience, specializing in React, TypeScript, and Rust. I've built production exchange adapters and trading systems, and I'm looking for my next remote opportunity.\n\nWould you be open to a brief conversation about potential opportunities at ${company.name}?\n\nLooking forward to hearing from you.`;

          const personalizedBody = personalizeEmailBody(
            bodyTemplate,
            firstName,
          );
          const htmlContent = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">${textToHtml(personalizedBody)}</div>${signature}`;

          const result = await sendAndSaveEmail({
            to: contact.email!,
            subject,
            htmlContent,
            textContent: personalizedBody,
            recipientName: `${contact.first_name} ${contact.last_name || ""}`.trim(),
            contactId: contact.id,
            companyId,
            scheduledAt: scheduledAt.toISOString(),
            sequenceType: "initial",
            sequenceNumber: 0,
          });

          if (result.success && result.resendId) {
            successCount++;
            emailIds.push(result.resendId);
          } else {
            errorCount++;
            send("progress", {
              stage: "error",
              current: i + 1,
              total: validContacts.length,
              message: `Failed for ${contact.email}: ${result.error}`,
            });
          }
        } catch (err) {
          errorCount++;
          send("progress", {
            stage: "error",
            current: i + 1,
            total: validContacts.length,
            message: `Error for ${contact.email}: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
        }
      }

      send("complete", {
        successCount,
        errorCount,
        totalContacts: validContacts.length,
        businessDays: dayOffset + 1,
        emailIds,
        message: `Scheduled ${successCount} emails across ${dayOffset + 1} business day(s). ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
      });
    } catch (err) {
      send("error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
