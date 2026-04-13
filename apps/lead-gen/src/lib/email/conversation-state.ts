/**
 * Conversation state machine — tracks lifecycle of each contact conversation.
 *
 * States: initial_sent → follow_up_1 → follow_up_2 → follow_up_3
 *         ↘ replied_interested | replied_info_request | replied_not_interested
 *         ↘ meeting_scheduled → converted
 *         ↘ closed
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import type { ReplyClass } from "./reply-classifier";

export type ConversationStage =
  | "initial_sent"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "replied_interested"
  | "replied_info_request"
  | "replied_not_interested"
  | "meeting_scheduled"
  | "converted"
  | "closed";

const CLASSIFICATION_TO_STAGE: Partial<Record<ReplyClass, ConversationStage>> = {
  interested: "replied_interested",
  not_interested: "replied_not_interested",
  info_request: "replied_info_request",
  unsubscribe: "closed",
};

/**
 * Advance a contact's conversation stage based on a reply classification.
 * Only transitions forward — e.g., won't go from "replied_interested" back to "initial_sent".
 */
export async function advanceConversationState(
  contactId: number,
  classification: ReplyClass,
): Promise<ConversationStage | null> {
  const newStage = CLASSIFICATION_TO_STAGE[classification];
  if (!newStage) return null; // auto_reply and bounced don't change state

  await db
    .update(contacts)
    .set({
      conversation_stage: newStage,
      updated_at: new Date().toISOString(),
    })
    .where(eq(contacts.id, contactId));

  console.log(`[CONVERSATION_STATE] Contact ${contactId} → ${newStage}`);
  return newStage;
}

/**
 * Set conversation stage when an outbound email is sent (initial or follow-up).
 */
export async function setOutboundStage(
  contactId: number,
  sequenceNumber: string,
): Promise<void> {
  const seqNum = parseInt(sequenceNumber, 10);
  let stage: ConversationStage;

  if (seqNum === 0) stage = "initial_sent";
  else if (seqNum === 1) stage = "follow_up_1";
  else if (seqNum === 2) stage = "follow_up_2";
  else stage = "follow_up_3";

  // Only advance forward — don't overwrite a reply state with a follow-up state
  const [contact] = await db
    .select({ conversation_stage: contacts.conversation_stage })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  const currentStage = contact?.conversation_stage;
  const replyStages = new Set([
    "replied_interested",
    "replied_info_request",
    "replied_not_interested",
    "meeting_scheduled",
    "converted",
    "closed",
  ]);

  if (currentStage && replyStages.has(currentStage)) {
    // Don't overwrite reply state with outbound state
    return;
  }

  await db
    .update(contacts)
    .set({
      conversation_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .where(eq(contacts.id, contactId));
}
