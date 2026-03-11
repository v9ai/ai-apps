/**
 * Follow-up Email System — intelligent follow-up sequences.
 *
 * - Finds sent emails without replies
 * - Generates context-aware follow-up instructions
 * - Tracks reply status to stop follow-up chains
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and, or } from "drizzle-orm";
import { createD1HttpClient } from "@/db/d1-http";
import { contactEmails } from "@/db/schema";

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export interface FollowUpConfig {
  daysAfter: number;
  sequenceNumber: string;
  customSubject?: string | null;
  customInstructions?: string | null;
}

export interface FollowUpResult {
  success: boolean;
  message: string;
  contactCount: number;
  emailIds: string[];
}

/**
 * Find emails from a previous sequence that need follow-up.
 * Includes sent/delivered/opened emails that haven't received replies.
 */
export async function findEmailsNeedingFollowUp(
  companyId: number,
  previousSequence: number,
) {
  const db = getDb();
  return db
    .select()
    .from(contactEmails)
    .where(
      and(
        eq(contactEmails.sequence_number, previousSequence.toString()),
        or(
          eq(contactEmails.status, "sent"),
          eq(contactEmails.status, "delivered"),
          eq(contactEmails.status, "opened"),
        ),
        eq(contactEmails.reply_received, false),
      ),
    );
}

/**
 * Build AI instructions for different follow-up sequences.
 */
export function buildFollowUpInstructions(
  sequenceNumber: string,
  daysSinceOriginal: number,
  originalSubject: string,
  customInstructions?: string | null,
): string {
  const baseInstructions = customInstructions || "";
  const seqNum = parseInt(sequenceNumber, 10);

  const templates: Record<number, string> = {
    1: `This is a FIRST FOLLOW-UP email sent ${daysSinceOriginal} days after the initial outreach about "${originalSubject}".

CRITICAL GUIDELINES:
- Reference the previous email naturally ("Following up on my message from last week...")
- Keep it SHORT and FRIENDLY (max 120 words)
- Acknowledge they might be busy
- Gently reiterate interest without being pushy
- Include ONE specific question or simple call-to-action

${baseInstructions}

DO NOT:
- Apologize excessively for following up
- Repeat everything from the first email
- Sound desperate or aggressive`,

    2: `This is a SECOND FOLLOW-UP email sent ${daysSinceOriginal} days after the initial outreach about "${originalSubject}".

CRITICAL GUIDELINES:
- Be BRIEF and respectful (max 100 words)
- Acknowledge this is your second follow-up
- Offer flexibility ("Happy to connect when timing is better")
- Suggest a specific next step if interested
- Keep the door open without pressure

${baseInstructions}

DO NOT:
- Sound annoyed or impatient
- Give ultimatums
- Make assumptions about why they haven't responded`,

    3: `This is a FINAL FOLLOW-UP email sent ${daysSinceOriginal} days after the initial outreach about "${originalSubject}".

CRITICAL GUIDELINES:
- Be CONCISE and gracious (max 80 words)
- Clearly state this is your final message
- Respect their time and decision
- Leave the door genuinely open for future contact
- End on a positive, professional note

${baseInstructions}

DO NOT:
- Try to guilt them into responding
- Sound bitter or disappointed
- Use FOMO tactics or create false urgency`,
  };

  return templates[seqNum] || templates[3];
}

/**
 * Mark an email as replied to stop the follow-up sequence.
 */
export async function markEmailAsReplied(
  resendId: string,
): Promise<boolean> {
  try {
    const db = getDb();
    await db
      .update(contactEmails)
      .set({
        reply_received: true,
        reply_received_at: new Date().toISOString(),
        followup_status: "completed",
      })
      .where(eq(contactEmails.resend_id, resendId));

    return true;
  } catch (error) {
    console.error(`[FOLLOWUP] Failed to mark ${resendId} as replied:`, error);
    return false;
  }
}
