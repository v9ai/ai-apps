import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactEmails, contacts, receivedEmails } from "@/db/schema";
import { classifyReply } from "@/lib/email/reply-classifier";
import { matchContact } from "@/lib/email/contact-matcher";
import { resend } from "@/lib/resend";

/**
 * Resend Webhook Handler
 *
 * Handles webhook events from Resend to track email delivery status and persist
 * state changes to the database.
 *
 * Supported events:
 * - email.sent            → update status + sent_at
 * - email.delivered       → update status + delivered_at
 * - email.bounced         → update status + error_message, stop follow-up,
 *                           mark contact email as bounced
 * - email.complained      → update status, stop follow-up
 * - email.delivery_delayed → update status
 * - email.opened          → set opened_at
 * - email.clicked         → log only
 * - email.received        → forward to personal inbox via Resend
 *
 * Setup:
 * 1. Go to https://resend.com/webhooks
 * 2. Create a webhook pointing to: https://yourdomain.com/api/webhooks/resend
 * 3. Copy the signing secret
 * 4. Add to .env.local: RESEND_WEBHOOK_SECRET=whsec_...
 */

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const SENDER_EMAIL = "contact@vadim.blog";
const NOTIFICATION_EMAIL = "nicolai.vadim@gmail.com";

// Retry delays in milliseconds
const RETRY_DELAYS = [100, 500, 1000];

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    bounce_type?: string;
    complaint_type?: string;
    link?: string;
    html?: string;
    text?: string;
    bounce?: {
      type: string;
      subType: string;
      message: string;
      diagnosticCode?: string[];
    };
  };
}

/**
 * Verify Svix webhook signature.
 * Svix uses HMAC-SHA256 to sign webhooks.
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string,
  webhookId: string,
): boolean {
  // Check timestamp freshness (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  if (Math.abs(now - webhookTimestamp) > 300) {
    console.error("[RESEND_WEBHOOK] Webhook timestamp too old");
    return false;
  }

  // Create signed payload
  const signedPayload = `${webhookId}.${timestamp}.${payload}`;

  // Create HMAC-SHA256 signature
  // Svix uses base64-encoded secret
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
  const hmac = createHmac("sha256", secretBytes);
  hmac.update(signedPayload);
  const expectedSignature = `v1,${hmac.digest("base64")}`;

  // Constant-time comparison to prevent timing attacks
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);

  if (signatureBytes.length !== expectedBytes.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signatureBytes.length; i++) {
    result |= signatureBytes[i] ^ expectedBytes[i];
  }

  return result === 0;
}

/**
 * Retry a DB operation up to 3 times with increasing delays.
 * Returns undefined (silently) on exhausted retries to prevent Resend loops.
 */
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === RETRY_DELAYS.length;
      const msg = err instanceof Error ? err.message : String(err);
      if (isLast) {
        console.error(`[RESEND_WEBHOOK] ${label} failed after all retries:`, msg);
        return undefined;
      }
      const delay = RETRY_DELAYS[attempt];
      console.warn(`[RESEND_WEBHOOK] ${label} attempt ${attempt + 1} failed (retry in ${delay}ms):`, msg);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Look up a contactEmail row by resend_id and return it, or null if not found.
 */
async function findContactEmail(resendId: string) {
  const rows = await db
    .select()
    .from(contactEmails)
    .where(eq(contactEmails.resend_id, resendId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Per-event handlers
// ---------------------------------------------------------------------------

async function handleSent(emailId: string): Promise<void> {
  await withRetry(`handleSent(${emailId})`, async () => {
    await db
      .update(contactEmails)
      .set({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.log(`[RESEND_WEBHOOK] email.sent persisted: ${emailId}`);
  });
}

async function handleDelivered(emailId: string): Promise<void> {
  await withRetry(`handleDelivered(${emailId})`, async () => {
    await db
      .update(contactEmails)
      .set({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.log(`[RESEND_WEBHOOK] email.delivered persisted: ${emailId}`);
  });
}

async function handleBounced(event: ResendWebhookEvent): Promise<void> {
  const emailId = event.data.email_id;
  const bounce = event.data.bounce;

  const errorMessage = bounce
    ? `${bounce.type}: ${bounce.subType} — ${bounce.message}${bounce.diagnosticCode?.length ? ` (${bounce.diagnosticCode.join(", ")})` : ""}`
    : event.data.bounce_type ?? "Unknown bounce";

  // 1. Update contactEmails row
  await withRetry(`handleBounced/updateEmail(${emailId})`, async () => {
    await db
      .update(contactEmails)
      .set({
        status: "bounced",
        error_message: errorMessage,
        followup_status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.warn(`[RESEND_WEBHOOK] email.bounced persisted: ${emailId}`);
  });

  // 2. Find contact and update bounced_emails + email fields
  // The recipient list may contain multiple addresses; process each.
  const recipientEmails = event.data.to ?? [];

  for (const recipientEmail of recipientEmails) {
    const normalised = recipientEmail.trim().toLowerCase();

    await withRetry(`handleBounced/updateContact(${normalised})`, async () => {
  
      // Case-insensitive lookup using lower()
      const matchedContacts = await db
        .select()
        .from(contacts)
        .where(sql`lower(${contacts.email}) = ${normalised}`)
        .limit(1);

      const contact = matchedContacts[0];
      if (!contact) {
        console.warn(`[RESEND_WEBHOOK] No contact found for bounced email: ${normalised}`);
        return;
      }

      // Parse existing bounced_emails JSON array
      let bouncedList: string[] = [];
      if (contact.bounced_emails) {
        try {
          bouncedList = JSON.parse(contact.bounced_emails);
        } catch {
          bouncedList = [];
        }
      }

      // Add to bounced list (deduplicated)
      if (!bouncedList.includes(normalised)) {
        bouncedList.push(normalised);
      }

      // Parse emails JSON array to also check secondary emails
      let emailsList: string[] = [];
      if (contact.emails) {
        try {
          emailsList = JSON.parse(contact.emails);
        } catch {
          emailsList = [];
        }
      }
      // Remove the bounced address from the secondary emails list
      emailsList = emailsList.filter((e) => e.toLowerCase() !== normalised);

      // Determine whether the primary email matches the bounce
      const primaryMatches = contact.email?.toLowerCase() === normalised;

      await db
        .update(contacts)
        .set({
          bounced_emails: JSON.stringify(bouncedList),
          emails: JSON.stringify(emailsList),
          // Clear primary email if it was the one that bounced
          ...(primaryMatches ? { email: null } : {}),
          // Mark as unverified whenever a bounce is recorded
          email_verified: false,
          updated_at: new Date().toISOString(),
        })
        .where(eq(contacts.id, contact.id));

      console.warn(
        `[RESEND_WEBHOOK] Contact ${contact.id} bounce recorded for ${normalised}` +
          (primaryMatches ? " (primary email cleared)" : ""),
      );
    });
  }
}

async function handleComplained(emailId: string): Promise<void> {
  await withRetry(`handleComplained(${emailId})`, async () => {
    await db
      .update(contactEmails)
      .set({
        status: "complained",
        followup_status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.warn(`[RESEND_WEBHOOK] email.complained persisted: ${emailId}`);
  });
}

async function handleDeliveryDelayed(emailId: string): Promise<void> {
  await withRetry(`handleDeliveryDelayed(${emailId})`, async () => {
    await db
      .update(contactEmails)
      .set({
        status: "delayed",
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.warn(`[RESEND_WEBHOOK] email.delivery_delayed persisted: ${emailId}`);
  });
}

async function handleOpened(emailId: string): Promise<void> {
  // Only set opened_at once — do not overwrite an existing value
  await withRetry(`handleOpened(${emailId})`, async () => {

    const existing = await findContactEmail(emailId);
    if (!existing) {
      console.warn(`[RESEND_WEBHOOK] email.opened — no DB row for: ${emailId}`);
      return;
    }

    if (existing.opened_at) {
      // Already recorded; idempotent skip
      return;
    }

    await db
      .update(contactEmails)
      .set({
        opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(contactEmails.resend_id, emailId));
    console.log(`[RESEND_WEBHOOK] email.opened persisted: ${emailId}`);
  });
}

/**
 * Persist an inbound received email and forward to personal inbox.
 */
async function handleReceived(event: ResendWebhookEvent): Promise<void> {
  const { email_id: emailId, from, to, subject, html, text } = event.data;

  // 1. Persist to database
  await withRetry(`handleReceived/persist(${emailId})`, async () => {
    await db
      .insert(receivedEmails)
      .values({
        resend_id: emailId,
        from_email: from ?? null,
        to_emails: JSON.stringify(to ?? []),
        cc_emails: JSON.stringify((event.data as any).cc ?? []),
        reply_to_emails: JSON.stringify((event.data as any).reply_to ?? []),
        subject: subject ?? null,
        message_id: (event.data as any).message_id ?? null,
        html_content: html ?? null,
        text_content: text ?? null,
        attachments: JSON.stringify((event.data as any).attachments ?? []),
        received_at: event.created_at ?? new Date().toISOString(),
      })
      .onConflictDoNothing();
    console.log(`[RESEND_WEBHOOK] email.received persisted: ${emailId}`);
  });

  // 1b. Fetch full email content from Resend API (webhook payload lacks body)
  if (!html && !text) {
    await withRetry(`handleReceived/fetchContent(${emailId})`, async () => {
      const full = await resend.instance.getReceivedEmail(emailId);
      if (full && (full.html || full.text)) {
        await db
          .update(receivedEmails)
          .set({
            html_content: full.html ?? null,
            text_content: full.text ?? null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(receivedEmails.resend_id, emailId));
        console.log(`[RESEND_WEBHOOK] fetched content for ${emailId}`);
      }
    });
  }

  // 2. Classify reply and match to contact
  await withRetry(`handleReceived/classify(${emailId})`, async () => {
    // Use webhook body if available, otherwise read from DB (fetched in step 1b)
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

    // Classify the reply
    const result = classifyReply(emailSubject, textBody);

    // Match to a contact
    const contactMatch = await matchContact(
      from || "",
      (event.data as any).in_reply_to ?? null,
    );

    // Update the received email with classification + contact match
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
      `[RESEND_WEBHOOK] classified: ${result.label} (${result.confidence.toFixed(2)})` +
        (contactMatch ? ` → contact ${contactMatch.contactId}` : ""),
    );

    // Side effects based on classification
    if (contactMatch?.contactId) {
      if (result.label === "unsubscribe") {
        // Mark contact as do_not_contact
        await db
          .update(contacts)
          .set({ do_not_contact: true, updated_at: new Date().toISOString() })
          .where(eq(contacts.id, contactMatch.contactId));
        console.log(`[RESEND_WEBHOOK] contact ${contactMatch.contactId} marked do_not_contact (unsubscribe)`);
      }

      if (contactMatch.outboundEmailId) {
        // Update outbound email with reply classification
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
    }
  });

  // 3. Forward to personal inbox
  if (!RESEND_API_KEY) {
    console.warn("[RESEND_WEBHOOK] RESEND_API_KEY not set — cannot forward received email");
    return;
  }

  const forwardPayload = {
    from: SENDER_EMAIL,
    to: [NOTIFICATION_EMAIL],
    subject: `[Fwd] ${subject ?? "(no subject)"}`,
    reply_to: from,
    ...(html ? { html: `<p><strong>Forwarded from:</strong> ${from}</p><hr />${html}` } : {}),
    ...(text ? { text: `Forwarded from: ${from}\n\n${text}` } : {}),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardPayload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[RESEND_WEBHOOK] Failed to forward received email: ${response.status} ${body}`);
    } else {
      console.log(`[RESEND_WEBHOOK] email.received forwarded to ${NOTIFICATION_EMAIL} (from: ${from})`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RESEND_WEBHOOK] Error forwarding received email:", msg);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("svix-signature");
    const webhookId = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");

    if (!signature || !webhookId || !timestamp) {
      console.error("[RESEND_WEBHOOK] Missing webhook headers");
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 },
      );
    }

    if (!WEBHOOK_SECRET) {
      console.error("[RESEND_WEBHOOK] RESEND_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const rawBody = await req.text();

    // Verify webhook signature BEFORE parsing
    const isValid = verifySignature(rawBody, signature, WEBHOOK_SECRET, timestamp, webhookId);
    if (!isValid) {
      console.error("[RESEND_WEBHOOK] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    let event: ResendWebhookEvent;

    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error("[RESEND_WEBHOOK] Failed to parse webhook body");
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const { email_id: emailId } = event.data;

    console.log(`[RESEND_WEBHOOK] Received event: ${event.type}`, {
      emailId,
      to: event.data.to,
      subject: event.data.subject,
    });

    switch (event.type) {
      case "email.sent":
        await handleSent(emailId);
        break;

      case "email.delivered":
        await handleDelivered(emailId);
        break;

      case "email.bounced":
        await handleBounced(event);
        break;

      case "email.complained":
        await handleComplained(emailId);
        break;

      case "email.delivery_delayed":
        await handleDeliveryDelayed(emailId);
        break;

      case "email.opened":
        await handleOpened(emailId);
        break;

      case "email.clicked":
        // No DB update needed — log only
        console.log(`[RESEND_WEBHOOK] email.clicked: ${emailId}`, {
          link: event.data.link,
        });
        break;

      case "email.received":
        await handleReceived(event);
        break;

      default:
        console.log(`[RESEND_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to prevent Resend from retrying indefinitely
    return NextResponse.json({
      received: true,
      eventType: event.type,
      emailId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[RESEND_WEBHOOK] Unexpected error processing webhook:", message);

    // Always return 200 to prevent Resend from retrying indefinitely
    return NextResponse.json({
      received: true,
      error: message,
    });
  }
}
