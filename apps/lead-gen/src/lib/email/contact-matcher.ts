/**
 * Contact matcher — match inbound received emails to contacts and outbound emails.
 *
 * Three matching strategies (in priority order):
 * 1. In-Reply-To header → contact_emails.resend_id (most precise)
 * 2. from_email → contacts.email / contacts.emails (JSON array)
 * 3. Subject line → contact_emails.subject (fuzzy fallback)
 */

import { eq, sql, desc } from "drizzle-orm";
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
 * Parse a Resend ID from an In-Reply-To or References header value.
 * Header format: "<resend_id@resend.dev>" → extracts "resend_id"
 * Also handles multiple message IDs separated by spaces.
 */
export function parseResendIdFromHeader(header: string): string | null {
  // Match angle-bracketed message IDs with @resend.dev domain
  const matches = header.match(/<([^@>]+)@resend\.dev>/g);
  if (!matches || matches.length === 0) return null;

  // Extract the local part from the first match
  const match = matches[0].match(/<([^@>]+)@resend\.dev>/);
  return match ? match[1] : null;
}

/**
 * Strip reply/forward prefixes from a subject line.
 */
function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(?:(?:Re|Fwd|FW|Fw|RE):\s*)+/i, "").trim();
}

/**
 * Match an inbound email to an outbound contact_email by subject line.
 * Only matches if the stripped subject is >= 10 chars and maps to exactly one contact.
 */
export async function matchContactBySubject(
  subject: string,
): Promise<ContactMatch | null> {
  const stripped = stripSubjectPrefixes(subject);
  if (stripped.length < 10) return null;

  const rows = await db
    .select({
      id: contactEmails.id,
      contact_id: contactEmails.contact_id,
    })
    .from(contactEmails)
    .where(sql`lower(${contactEmails.subject}) = ${stripped.toLowerCase()}`)
    .orderBy(desc(contactEmails.sent_at))
    .limit(10);

  if (rows.length === 0) return null;

  // Check for ambiguity — if multiple distinct contacts match, skip
  const uniqueContacts = new Set(rows.map((r) => r.contact_id));
  if (uniqueContacts.size > 1) {
    console.log(
      `[CONTACT_MATCHER] subject match ambiguous (${uniqueContacts.size} contacts) for: "${stripped}"`,
    );
    return null;
  }

  const best = rows[0];
  console.log(
    `[CONTACT_MATCHER] subject match → contact ${best.contact_id}, outbound ${best.id}`,
  );
  return { contactId: best.contact_id, outboundEmailId: best.id };
}

/**
 * Full contact matching with three strategies (in priority order):
 * 1. In-Reply-To header match (most precise)
 * 2. Sender email match (reliable)
 * 3. Subject line match (fuzzy fallback)
 */
export async function matchContact(
  fromEmail: string,
  inReplyToResendId?: string | null,
  subject?: string | null,
): Promise<ContactMatch | null> {
  // Strategy 1: match by In-Reply-To resend_id (most precise)
  if (inReplyToResendId) {
    const outbound = await matchOutboundByResendId(inReplyToResendId);
    if (outbound) {
      return {
        contactId: outbound.contactId,
        outboundEmailId: outbound.outboundEmailId,
      };
    }
  }

  // Strategy 2: match by sender email
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

  // Strategy 3: match by subject line (fuzzy fallback)
  if (subject) {
    const subjectMatch = await matchContactBySubject(subject);
    if (subjectMatch) {
      return subjectMatch;
    }
  }

  return null;
}
