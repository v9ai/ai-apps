import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactEmails, contacts, receivedEmails } from "@/db/schema";
import { classifyReplyHybrid } from "@/lib/email/reply-classifier";
import { matchContact, parseResendIdFromHeader } from "@/lib/email/contact-matcher";
import { resend } from "@/lib/resend";

const SENDER_EMAIL = "contact@vadim.blog";
const NOTIFICATION_EMAIL = "nicolai.vadim@gmail.com";
const ALIAS_DOMAIN = "vadim.blog";
const RESERVED_LOCAL_PARTS = new Set([
  "contact",
  "postmaster",
  "abuse",
  "hostmaster",
  "admin",
  "noreply",
  "no-reply",
]);

/**
 * If any recipient is `{alias}@vadim.blog` where alias is not a reserved
 * mailbox (contact, postmaster, etc.), return the alias. Otherwise null.
 */
function extractAlias(recipients: string[]): string | null {
  for (const raw of recipients) {
    const addr = raw.trim().toLowerCase();
    if (!addr.endsWith(`@${ALIAS_DOMAIN}`)) continue;
    const local = addr.slice(0, addr.length - ALIAS_DOMAIN.length - 1);
    if (!local || RESERVED_LOCAL_PARTS.has(local)) continue;
    return local;
  }
  return null;
}

export interface ProcessReceivedOptions {
  skipAutoDraft?: boolean;
  skipForward?: boolean;
}

export async function processReceivedEmail(
  emailId: string,
  from: string | null,
  to: string[],
  subject: string | null,
  html: string | null | undefined,
  text: string | null | undefined,
  receivedAt: string,
  extra?: {
    cc?: string[];
    reply_to?: string[];
    message_id?: string;
    attachments?: unknown[];
  },
  options?: ProcessReceivedOptions,
): Promise<{ inserted: boolean; contactId: number | null; classification: string | null }> {
  // 1. Persist to database
  const insertResult = await db
    .insert(receivedEmails)
    .values({
      resend_id: emailId,
      from_email: from ?? null,
      to_emails: JSON.stringify(to ?? []),
      cc_emails: JSON.stringify(extra?.cc ?? []),
      reply_to_emails: JSON.stringify(extra?.reply_to ?? []),
      subject: subject ?? null,
      message_id: extra?.message_id ?? null,
      html_content: html ?? null,
      text_content: text ?? null,
      attachments: JSON.stringify(extra?.attachments ?? []),
      received_at: receivedAt,
    })
    .onConflictDoNothing()
    .returning({ id: receivedEmails.id });

  if (insertResult.length === 0) {
    return { inserted: false, contactId: null, classification: null };
  }

  console.log(`[PROCESS_RECEIVED] persisted: ${emailId}`);

  // 1b. Fetch full email from Resend API for headers + content.
  // Runs before the alias branch so alias-forwarded rows also get body content.
  let fullEmail: Awaited<ReturnType<typeof resend.instance.getReceivedEmail>> = null;
  try {
    fullEmail = await resend.instance.getReceivedEmail(emailId);
    if (fullEmail && !html && !text && (fullEmail.html || fullEmail.text)) {
      await db
        .update(receivedEmails)
        .set({
          html_content: fullEmail.html ?? null,
          text_content: fullEmail.text ?? null,
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.resend_id, emailId));
    }
  } catch (err) {
    console.error(`[PROCESS_RECEIVED] failed to fetch full email ${emailId}:`, err);
  }

  // Alias forwarding: if addressed to `{alias}@vadim.blog` (non-reserved),
  // look up the owning contact and forward via Resend's forward() helper.
  // These are transactional messages (verification, etc.) — not replies —
  // so we skip classification, conversation state, and auto-draft.
  const aliasLocal = extractAlias(to ?? []);
  if (aliasLocal) {
    const [aliasContact] = await db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(sql`lower(${contacts.forwarding_alias}) = ${aliasLocal}`)
      .limit(1);

    if (aliasContact?.email) {
      const fwdResult = await resend.instance.forwardReceivedEmail(
        emailId,
        aliasContact.email,
        SENDER_EMAIL,
      );

      if (fwdResult.error) {
        console.error(
          `[PROCESS_RECEIVED] alias forward failed for ${aliasLocal}@${ALIAS_DOMAIN}:`,
          fwdResult.error,
        );
      } else {
        console.log(
          `[PROCESS_RECEIVED] forwarded ${aliasLocal}@${ALIAS_DOMAIN} → ${aliasContact.email} (resend id: ${fwdResult.id})`,
        );
      }

      await db
        .update(receivedEmails)
        .set({
          classification: "alias_forward",
          classification_confidence: 1.0,
          classified_at: new Date().toISOString(),
          matched_contact_id: aliasContact.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(receivedEmails.resend_id, emailId));

      return {
        inserted: true,
        contactId: aliasContact.id,
        classification: "alias_forward",
      };
    }

    console.warn(
      `[PROCESS_RECEIVED] alias ${aliasLocal}@${ALIAS_DOMAIN} has no matching contact — falling through to normal classification`,
    );
  }

  // 2. Classify reply and match to contact
  let textBody = text || "";
  if (!textBody) {
    const [row] = await db
      .select({ text_content: receivedEmails.text_content })
      .from(receivedEmails)
      .where(eq(receivedEmails.resend_id, emailId))
      .limit(1);
    textBody = row?.text_content || "";
  }
  const emailSubject = subject || "";

  const inReplyToHeader =
    fullEmail?.headers?.["In-Reply-To"] ||
    fullEmail?.headers?.["in-reply-to"] ||
    null;
  const inReplyToResendId = inReplyToHeader
    ? parseResendIdFromHeader(inReplyToHeader)
    : null;

  const contactMatch = await matchContact(
    from || "",
    inReplyToResendId,
    emailSubject || null,
  );

  let threadContext: string | undefined;
  if (contactMatch?.outboundEmailId) {
    const [outbound] = await db
      .select({ subject: contactEmails.subject, text_content: contactEmails.text_content })
      .from(contactEmails)
      .where(eq(contactEmails.id, contactMatch.outboundEmailId))
      .limit(1);
    if (outbound) {
      threadContext = `Subject: ${outbound.subject}\n${outbound.text_content || ""}`;
    }
  }

  const result = await classifyReplyHybrid(emailSubject, textBody, threadContext);

  await db
    .update(receivedEmails)
    .set({
      classification: result.label,
      classification_confidence: result.confidence,
      classified_at: new Date().toISOString(),
      ...(contactMatch?.contactId ? { matched_contact_id: contactMatch.contactId } : {}),
      ...(contactMatch?.outboundEmailId ? { matched_outbound_id: contactMatch.outboundEmailId } : {}),
      updated_at: new Date().toISOString(),
    })
    .where(eq(receivedEmails.resend_id, emailId));

  console.log(
    `[PROCESS_RECEIVED] classified: ${result.label} (${result.confidence.toFixed(2)})` +
      (contactMatch ? ` → contact ${contactMatch.contactId}` : ""),
  );

  // Save alternate sender email on the matched contact
  if (contactMatch?.contactId && from) {
    const senderNorm = from.trim().toLowerCase();
    if (senderNorm.includes("@")) {
      const [contact] = await db
        .select({ email: contacts.email, emails: contacts.emails })
        .from(contacts)
        .where(eq(contacts.id, contactMatch.contactId))
        .limit(1);
      if (contact) {
        const knownEmails = new Set<string>();
        if (contact.email) knownEmails.add(contact.email.toLowerCase());
        if (Array.isArray(contact.emails)) {
          for (const e of contact.emails) knownEmails.add(String(e).toLowerCase());
        }
        if (!knownEmails.has(senderNorm)) {
          const updatedEmails = [...(Array.isArray(contact.emails) ? contact.emails : []), senderNorm] as string[];
          await db
            .update(contacts)
            .set({ emails: JSON.stringify(updatedEmails), updated_at: new Date().toISOString() })
            .where(eq(contacts.id, contactMatch.contactId));
          console.log(`[PROCESS_RECEIVED] saved alternate email ${senderNorm} on contact ${contactMatch.contactId}`);
        }
      }
    }
  }

  // Side effects
  if (contactMatch?.contactId) {
    if (result.label === "unsubscribe") {
      await db
        .update(contacts)
        .set({ do_not_contact: true, updated_at: new Date().toISOString() })
        .where(eq(contacts.id, contactMatch.contactId));
    }

    if (contactMatch.outboundEmailId) {
      await db
        .update(contactEmails)
        .set({
          reply_received: true,
          reply_received_at: new Date().toISOString(),
          reply_classification: result.label,
          updated_at: new Date().toISOString(),
        })
        .where(eq(contactEmails.id, contactMatch.outboundEmailId));
    }

    import("@/lib/email/conversation-state")
      .then(({ advanceConversationState }) =>
        advanceConversationState(contactMatch.contactId!, result.label),
      )
      .catch((err) => {
        console.error(`[PROCESS_RECEIVED] conversation state update failed:`, err);
      });

    if (
      !options?.skipAutoDraft &&
      (result.label === "interested" || result.label === "info_request") &&
      result.confidence > 0.5
    ) {
      const [receivedRow] = await db
        .select({ id: receivedEmails.id })
        .from(receivedEmails)
        .where(eq(receivedEmails.resend_id, emailId))
        .limit(1);

      if (receivedRow) {
        import("@/lib/email/auto-draft")
          .then(({ generateReplyDraft }) =>
            generateReplyDraft(receivedRow.id, result.label, contactMatch!.contactId!),
          )
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[PROCESS_RECEIVED] auto-draft failed: ${msg}`);
          });
      }
    }
  }

  // Forward to personal inbox
  if (!options?.skipForward) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [NOTIFICATION_EMAIL],
            subject: `[Fwd] ${subject ?? "(no subject)"}`,
            reply_to: from,
            ...(html ? { html: `<p><strong>Forwarded from:</strong> ${from}</p><hr />${html}` } : {}),
            ...(text ? { text: `Forwarded from: ${from}\n\n${text}` } : {}),
          }),
        });
      } catch (err) {
        console.error("[PROCESS_RECEIVED] Error forwarding:", err);
      }
    }
  }

  return {
    inserted: true,
    contactId: contactMatch?.contactId ?? null,
    classification: result.label,
  };
}
