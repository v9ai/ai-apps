/**
 * Campaign Email Scheduler — schedule multi-template campaign sequences.
 */

import {
  addDays,
  addMinutes,
  differenceInBusinessDays,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import {
  getNextBusinessDay,
  createScheduledDate,
} from "@/lib/business-days";

export { getNextBusinessDay, createScheduledDate };

/**
 * Generate scheduled dates for a campaign sequence.
 * Each template gets the next consecutive business day at 8am.
 */
export function generateCampaignSchedule(templateCount: number): Date[] {
  const schedules: Date[] = [];
  const now = new Date();
  const maxAllowedDate = addDays(now, 29);
  const startDate = addDays(now, 1);

  for (let i = 0; i < templateCount; i++) {
    const businessDay = getNextBusinessDay(i, {
      fromDate: startDate,
      setTime: false,
    });
    let scheduledDate = createScheduledDate(businessDay, { sendHour: 8 });

    if (scheduledDate > maxAllowedDate) {
      scheduledDate = maxAllowedDate;
    }

    schedules.push(scheduledDate);
  }

  return schedules;
}

export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

export function getScheduledSendTime(delayMinutes: number = 10): string {
  if (delayMinutes < 0) throw new Error("Delay minutes must be non-negative");
  return addMinutes(new Date(), delayMinutes).toISOString();
}

export function getScheduledSendTimeFrom(
  baseTime: Date | number,
  delayMinutes: number = 10,
): string {
  if (delayMinutes < 0) throw new Error("Delay minutes must be non-negative");
  const base = typeof baseTime === "number" ? new Date(baseTime) : baseTime;
  return addMinutes(base, delayMinutes).toISOString();
}

export function formatScheduledTime(isoString: string): string {
  return parseISO(isoString).toLocaleTimeString();
}

export function getDelayMinutes(scheduledAt: string): number {
  return differenceInMinutes(parseISO(scheduledAt), new Date());
}

export function countBusinessDays(startDate: Date, endDate: Date): number {
  return differenceInBusinessDays(endDate, startDate) + 1;
}
