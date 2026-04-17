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
 * When ambiguous, tries to disambiguate using sender display name or email domain.
 */
export async function matchContactBySubject(
  subject: string,
  fromEmail?: string | null,
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

  const uniqueContacts = new Set(rows.map((r) => r.contact_id));
  if (uniqueContacts.size === 1) {
    const best = rows[0];
    console.log(
      `[CONTACT_MATCHER] subject match → contact ${best.contact_id}, outbound ${best.id}`,
    );
    return { contactId: best.contact_id, outboundEmailId: best.id };
  }

  // Ambiguous — try to disambiguate by matching sender against contact names/emails
  if (fromEmail) {
    const contactIds = [...uniqueContacts];
    const candidateContacts = await db
      .select({
        id: contacts.id,
        first_name: contacts.first_name,
        last_name: contacts.last_name,
        email: contacts.email,
        emails: contacts.emails,
      })
      .from(contacts)
      .where(sql`${contacts.id} IN ${contactIds}`);

    const senderNorm = fromEmail.trim().toLowerCase();
    const senderLocal = senderNorm.split("@")[0];
    const senderDomain = senderNorm.split("@")[1];

    // Try exact email match in primary or alternate emails
    const emailExact = candidateContacts.find(
      (c) =>
        c.email?.toLowerCase() === senderNorm ||
        (Array.isArray(c.emails) && c.emails.some((e: string) => e.toLowerCase() === senderNorm)),
    );
    if (emailExact) {
      const outbound = rows.find((r) => r.contact_id === emailExact.id);
      console.log(
        `[CONTACT_MATCHER] subject+email disambiguated → contact ${emailExact.id}`,
      );
      return { contactId: emailExact.id, outboundEmailId: outbound?.id ?? null };
    }

    // Try domain match (e.g. sender@pieper.io → contact email dominik@pieper.io)
    if (senderDomain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com", "proton.me"].includes(senderDomain)) {
      const domainMatch = candidateContacts.filter(
        (c) => c.email?.toLowerCase().endsWith(`@${senderDomain}`),
      );
      if (domainMatch.length === 1) {
        const outbound = rows.find((r) => r.contact_id === domainMatch[0].id);
        console.log(
          `[CONTACT_MATCHER] subject+domain disambiguated → contact ${domainMatch[0].id}`,
        );
        return { contactId: domainMatch[0].id, outboundEmailId: outbound?.id ?? null };
      }
    }

    // Try name match — check if sender local part contains contact name
    const nameMatch = candidateContacts.filter((c) => {
      const first = c.first_name?.toLowerCase() ?? "";
      const last = c.last_name?.toLowerCase() ?? "";
      if (!first && !last) return false;
      return (
        (first && senderLocal.includes(first)) ||
        (last && senderLocal.includes(last)) ||
        (first && last && senderNorm.includes(`${first}.${last}`))
      );
    });
    if (nameMatch.length === 1) {
      const outbound = rows.find((r) => r.contact_id === nameMatch[0].id);
      console.log(
        `[CONTACT_MATCHER] subject+name disambiguated → contact ${nameMatch[0].id}`,
      );
      return { contactId: nameMatch[0].id, outboundEmailId: outbound?.id ?? null };
    }
  }

  console.log(
    `[CONTACT_MATCHER] subject match ambiguous (${uniqueContacts.size} contacts) for: "${stripped}"`,
  );
  return null;
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

  // Strategy 3: match by subject line (fuzzy fallback, with sender-based disambiguation)
  if (subject) {
    const subjectMatch = await matchContactBySubject(subject, fromEmail);
    if (subjectMatch) {
      return subjectMatch;
    }
  }

  return null;
}
