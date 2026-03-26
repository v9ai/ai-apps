import { addDays, addBusinessDays } from "date-fns";

export interface GetNextBusinessDayOptions {
  fromDate?: Date;
  setTime?: boolean;
  hour?: number;
}

export interface ScheduledDateConfig {
  sendHour?: number;
}

/**
 * Calculate next business day (Mon-Fri) with offset.
 * Returns date at 8am UTC by default.
 */
export function getNextBusinessDay(
  offset: number,
  options: GetNextBusinessDayOptions = {},
): Date {
  const { fromDate, setTime = true, hour = 8 } = options;

  if (offset === 0 && fromDate) {
    return fromDate;
  }

  const startDate = fromDate || new Date();
  let scheduledDate = fromDate ? startDate : addDays(startDate, 1);

  // Skip weekends
  while (scheduledDate.getUTCDay() === 0 || scheduledDate.getUTCDay() === 6) {
    scheduledDate = addDays(scheduledDate, 1);
  }

  if (offset > 0) {
    scheduledDate = addBusinessDays(scheduledDate, offset);
  }

  if (setTime) {
    scheduledDate.setUTCHours(hour, 0, 0, 0);
  }

  return scheduledDate;
}

/**
 * Create a scheduled date at a specific hour (UTC timezone)
 */
export function createScheduledDate(
  baseDate: Date,
  config: ScheduledDateConfig = {},
): Date {
  const { sendHour = 8 } = config;

  return new Date(
    Date.UTC(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      sendHour,
      0,
      0,
      0,
    ),
  );
}
