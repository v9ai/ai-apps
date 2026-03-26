/**
 * Email utilities — personalization, bounce checking, send+save.
 */

import { eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import { contacts, contactEmails } from "@/db/schema";
import { resend } from "@/lib/resend";
import { EmailConfig } from "./config";


/**
 * Check if an email address has bounced (exists in any contact's bouncedEmails).
 */
export async function isEmailBounced(
  email: string,
): Promise<{ isBounced: boolean; contactId?: number }> {
  try {
    const allContacts = await db.select().from(contacts);

    for (const contact of allContacts) {
      if (!contact.bounced_emails) continue;
      try {
        const bounced: string[] = JSON.parse(contact.bounced_emails);
        if (bounced.includes(email)) {
          return { isBounced: true, contactId: contact.id };
        }
      } catch {
        // skip parse errors
      }
    }

    return { isBounced: false };
  } catch (error) {
    console.error("Error checking bounced email:", error);
    return { isBounced: false }; // fail open
  }
}

/**
 * Extract first name from a full name string.
 */
export function extractFirstName(name: string | null | undefined): string {
  if (!name?.trim()) return "there";
  const words = name.trim().split(/\s+/);
  const firstName = words[0] || name;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

/**
 * Personalize email body with recipient's first name.
 * Replaces {{name}} placeholders and prepends greeting if absent.
 */
export function personalizeEmailBody(
  body: string,
  firstName: string | null | undefined,
  fallbackName?: string,
): string {
  const firstWord = extractFirstName(firstName || fallbackName);
  let personalized = body.replace(/\{\{name\}\}/g, firstWord);

  const hasGreeting = /^(Hi|Hey|Hello)\s+/i.test(personalized.trim());
  if (!hasGreeting) {
    personalized = `Hi ${firstWord},\n\n${personalized}`;
  }

  return personalized;
}

/**
 * Convert plain text to HTML (newline to <br>).
 */
export function textToHtml(text: string): string {
  return text.replace(/\n/g, "<br>");
}

/**
 * Convert plain text to structured HTML with <p> and <br> tags.
 */
export function textToStructuredHtml(text: string): string {
  const paragraphs = text
    .split(/\n\n+/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("<br>");
      return lines ? `<p>${lines}</p>` : "";
    })
    .filter((p) => p.length > 0);
  return paragraphs.join("\n");
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipientName?: string;
  contactId?: number;
  companyId?: number;
  scheduledAt?: string;
  parentEmailId?: number;
  sequenceType?: string;
  sequenceNumber?: number;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  emailId?: number;
  error?: string;
}

/**
 * Send (or schedule) an email via Resend and save to contact_emails table.
 * Checks bounced list before sending.
 */
export async function sendAndSaveEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  try {
    const bouncedCheck = await isEmailBounced(params.to);
    if (bouncedCheck.isBounced) {
      return {
        success: false,
        error: `Email ${params.to} is bounced (contact ID: ${bouncedCheck.contactId})`,
      };
    }

    const result = await resend.instance.send({
      to: params.to,
      subject: params.subject,
      html: params.htmlContent,
      text: params.textContent,
      scheduledAt: params.scheduledAt,
      from: EmailConfig.SENDER,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.id) {
      return { success: false, error: "Resend returned no email ID" };
    }

    // Save to DB if we have a contactId
    if (params.contactId) {
      try {
            const [savedEmail] = await db
          .insert(contactEmails)
          .values({
            contact_id: params.contactId,
            resend_id: result.id,
            from_email: EmailConfig.SENDER_EMAIL,
            to_emails: JSON.stringify([params.to]),
            subject: params.subject,
            text_content: params.textContent || null,
            status: params.scheduledAt ? "scheduled" : "sent",
            sent_at: params.scheduledAt ? null : new Date().toISOString(),
            recipient_name: params.recipientName || null,
            scheduled_at: params.scheduledAt || null,
            parent_email_id: params.parentEmailId || null,
            sequence_type: params.sequenceType || "initial",
            sequence_number: params.sequenceNumber?.toString() || "0",
          })
          .returning();

        return {
          success: true,
          resendId: result.id,
          emailId: savedEmail?.id,
        };
      } catch (dbError) {
        console.error("[sendAndSaveEmail] DB save failed:", dbError);
        // Email was sent/scheduled successfully — just DB save failed
        return { success: true, resendId: result.id };
      }
    }

    return { success: true, resendId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

export interface BatchSendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipientName?: string;
  contactId?: number;
  companyId?: number;
  scheduledAt?: string;
}

export interface BatchSendResult {
  success: boolean;
  results: Array<{
    to: string;
    resendId?: string;
    emailId?: number;
    error?: string;
  }>;
  error?: string;
}

/**
 * Send a batch of emails sequentially, checking bounced list for each.
 */
export async function sendBatchAndSaveEmails(
  emailsToSend: BatchSendEmailParams[],
): Promise<BatchSendResult> {
  const results: BatchSendResult["results"] = [];

  for (const emailParams of emailsToSend) {
    const result = await sendAndSaveEmail({
      to: emailParams.to,
      subject: emailParams.subject,
      htmlContent: emailParams.htmlContent,
      textContent: emailParams.textContent,
      recipientName: emailParams.recipientName,
      contactId: emailParams.contactId,
      companyId: emailParams.companyId,
      scheduledAt: emailParams.scheduledAt,
    });

    results.push({
      to: emailParams.to,
      resendId: result.resendId,
      emailId: result.emailId,
      error: result.error,
    });
  }

  return {
    success: results.every((r) => !r.error),
    results,
  };
}
