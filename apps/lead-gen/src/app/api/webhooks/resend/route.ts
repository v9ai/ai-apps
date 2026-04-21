import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactEmails, contacts, webhookEvents } from "@/db/schema";
import { processReceivedEmail } from "@/lib/email/process-received";

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
 * Delegates to the shared processReceivedEmail function.
 */
async function handleReceived(event: ResendWebhookEvent): Promise<void> {
  const { email_id: emailId, from, to, subject, html, text } = event.data;
  const data = event.data as any;

  await processReceivedEmail(
    emailId,
    from ?? null,
    to ?? [],
    subject ?? null,
    html,
    text,
    event.created_at ?? new Date().toISOString(),
    {
      cc: data.cc,
      reply_to: data.reply_to,
      message_id: data.message_id,
      attachments: data.attachments,
    },
  );
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

    // Log every webhook event to the database
    const webhookEventId = await db
      .insert(webhookEvents)
      .values({
        event_type: event.type,
        email_id: emailId,
        from_email: event.data.from ?? null,
        to_emails: JSON.stringify(event.data.to ?? []),
        subject: event.data.subject ?? null,
        payload: rawBody,
        created_at: event.created_at ?? new Date().toISOString(),
      })
      .returning({ id: webhookEvents.id })
      .then((rows) => rows[0]?.id);

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

    // Update webhook event with success status
    if (webhookEventId) {
      db.update(webhookEvents)
        .set({ http_status: 200 })
        .where(eq(webhookEvents.id, webhookEventId))
        .catch(() => {});
    }

    return NextResponse.json({
      received: true,
      eventType: event.type,
      emailId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[RESEND_WEBHOOK] Unexpected error processing webhook:", message);

    return NextResponse.json({
      received: true,
      error: message,
    });
  }
}
