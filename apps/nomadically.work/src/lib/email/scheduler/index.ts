/**
 * Email Scheduler — distributes emails across business days with random delays.
 *
 * Constraints:
 * - Business days only (Mon-Fri)
 * - Adaptive daily limits (5/day small batches, scales up)
 * - 30-day max window (Resend limit)
 * - Random delays (2-45 min) between emails
 * - 8am UTC default send time
 */

import { addDays, addMinutes, isAfter, isBefore } from "date-fns";
import { createScheduledDate } from "@/lib/date/business-days";
import { EMAIL_SCHEDULE_CONFIG } from "../config";
import { calculateSchedulingPlan } from "./planning";

export { calculateSchedulingPlan } from "./planning";
export type { AdaptiveSchedulingConfig, SchedulingPlan } from "./planning";

export interface ScheduleConfig {
  sendHour: number;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  maxPerDay: number;
}

export interface EmailToSchedule {
  contactId: number;
  companyId?: number;
  email: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  firstName: string;
  lastName: string;
  parentEmailId?: number;
  sequenceType?: string;
  sequenceNumber?: number;
}

export interface ScheduledEmailEntry {
  email: string;
  scheduledAt: Date;
  batchDay: number;
  contactId: number;
  companyId?: number;
  firstName: string;
  lastName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  parentEmailId?: number;
  sequenceType?: string;
  sequenceNumber?: number;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  sendHour: EMAIL_SCHEDULE_CONFIG.sendHour,
  minDelayMinutes: EMAIL_SCHEDULE_CONFIG.minDelayMinutes,
  maxDelayMinutes: EMAIL_SCHEDULE_CONFIG.maxDelayMinutes,
  maxPerDay: EMAIL_SCHEDULE_CONFIG.maxPerDay,
};

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get all business days (Mon-Fri) within the next N calendar days.
 * Uses < boundary (not <=) for safety margin with random delays.
 */
function getNextBusinessDays(
  startDate: Date,
  maxCalendarDays: number = 30,
): Date[] {
  const businessDays: Date[] = [];
  const maxDate = addDays(startDate, maxCalendarDays);
  let currentDate = addDays(startDate, 1);

  while (isBefore(currentDate, maxDate)) {
    const dayOfWeek = currentDate.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(
        createScheduledDate(currentDate, { sendHour: DEFAULT_CONFIG.sendHour }),
      );
    }
    currentDate = addDays(currentDate, 1);
  }

  return businessDays;
}

/**
 * Calculate the schedule for a batch of emails.
 * Returns entries with scheduledAt dates — does NOT send.
 * The caller is responsible for sending via Resend and persisting to DB.
 */
export function buildSchedule(
  emails: EmailToSchedule[],
  config: Partial<ScheduleConfig> = {},
): ScheduledEmailEntry[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const plan = calculateSchedulingPlan({ contactCount: emails.length });
  const emailsPerDay = plan.emailsPerDay;

  const businessDays = getNextBusinessDays(new Date());
  const entries: ScheduledEmailEntry[] = [];

  if (businessDays.length === 0) {
    console.error("[Scheduler] No business days available within 30 calendar days");
    return [];
  }

  const maxEmailsToSchedule = Math.min(
    emails.length,
    emailsPerDay * businessDays.length,
  );

  const now = new Date();
  const maxAllowedDate = addDays(now, 30);

  for (let i = 0; i < maxEmailsToSchedule; i++) {
    const email = emails[i];
    const dayIndex = Math.floor(i / emailsPerDay);
    const baseDate = businessDays[dayIndex];

    if (!baseDate) continue;

    const randomDelay = randomInRange(
      finalConfig.minDelayMinutes,
      finalConfig.maxDelayMinutes,
    );
    const scheduledAt = addMinutes(baseDate, randomDelay);

    if (isAfter(scheduledAt, maxAllowedDate)) continue;

    entries.push({
      email: email.email,
      scheduledAt,
      batchDay: dayIndex + 1,
      contactId: email.contactId,
      companyId: email.companyId,
      firstName: email.firstName,
      lastName: email.lastName,
      subject: email.subject,
      htmlBody: email.htmlBody,
      textBody: email.textBody,
      parentEmailId: email.parentEmailId,
      sequenceType: email.sequenceType,
      sequenceNumber: email.sequenceNumber,
    });
  }

  return entries;
}

/**
 * Get a scheduling plan preview (without building full schedule).
 * Useful for showing the user what will happen before confirming.
 */
export function getSchedulePreview(emailCount: number) {
  const plan = calculateSchedulingPlan({ contactCount: emailCount });
  const businessDays = getNextBusinessDays(new Date());
  const daysUsed = Math.min(
    Math.ceil(emailCount / plan.emailsPerDay),
    businessDays.length,
  );

  return {
    ...plan,
    firstSendDate: businessDays[0] ?? null,
    lastSendDate: businessDays[Math.max(0, daysUsed - 1)] ?? null,
    availableBusinessDays: businessDays.length,
    daysUsed,
  };
}
