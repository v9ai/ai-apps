/**
 * Contact matcher — match inbound received emails to contacts and outbound emails.
 *
 * Two matching strategies:
 * 1. from_email → contacts.email / contacts.emails (JSON array)
 * 2. In-Reply-To / References header → contact_emails.resend_id
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, contactEmails } from "@/db/schema";

export interface ContactMatch {
  contactId: number;
  outboundEmailId: number | null;
}

/**
 * Match an inbound email to a contact by sender email address.
 * Checks both the primary `email` column and the `emails` JSON array.
 */
export async function matchContactByEmail(
  fromEmail: string,
): Promise<{ contactId: number } | null> {
  const normalised = fromEmail.trim().toLowerCase();

  // Check primary email (case-insensitive)
  const primaryMatch = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(sql`lower(${contacts.email}) = ${normalised}`)
    .limit(1);

  if (primaryMatch[0]) {
    return { contactId: primaryMatch[0].id };
  }

  // Check emails JSON array — PostgreSQL containment operator
  const arrayMatch = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(sql`${contacts.emails}::jsonb @> ${JSON.stringify([normalised])}::jsonb`)
    .limit(1);

  if (arrayMatch[0]) {
    return { contactId: arrayMatch[0].id };
  }

  return null;
}

/**
 * Match an inbound email to an outbound contact_email by resend_id.
 * Useful when the In-Reply-To header contains the outbound message ID.
 */
export async function matchOutboundByResendId(
  resendId: string,
): Promise<{ outboundEmailId: number; contactId: number } | null> {
  const rows = await db
    .select({
      id: contactEmails.id,
      contact_id: contactEmails.contact_id,
    })
    .from(contactEmails)
    .where(eq(contactEmails.resend_id, resendId))
    .limit(1);

  if (rows[0]) {
    return {
      outboundEmailId: rows[0].id,
      contactId: rows[0].contact_id,
    };
  }

  return null;
}

/**
 * Full contact matching: try email match first, then optionally outbound match.
 */
export async function matchContact(
  fromEmail: string,
  inReplyToResendId?: string | null,
): Promise<ContactMatch | null> {
  // Strategy 1: match by sender email
  const emailMatch = await matchContactByEmail(fromEmail);

  if (emailMatch) {
    // If we also have an outbound reference, try to find the specific email
    let outboundEmailId: number | null = null;
    if (inReplyToResendId) {
      const outbound = await matchOutboundByResendId(inReplyToResendId);
      if (outbound) {
        outboundEmailId = outbound.outboundEmailId;
      }
    }
    return { contactId: emailMatch.contactId, outboundEmailId };
  }

  // Strategy 2: match by outbound resend_id (fallback)
  if (inReplyToResendId) {
    const outbound = await matchOutboundByResendId(inReplyToResendId);
    if (outbound) {
      return {
        contactId: outbound.contactId,
        outboundEmailId: outbound.outboundEmailId,
      };
    }
  }

  return null;
}
