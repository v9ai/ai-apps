/**
 * Email configuration
 */

export class EmailConfig {
  static readonly DEFAULT_RECIPIENT = "nicolai.vadim@gmail.com";
  static readonly SENDER_EMAIL = "contact@vadim.blog";
  static readonly RECEIVING_EMAIL = "contact@vadim.blog";
  static readonly SENDER = "Vadim Nicolai <contact@vadim.blog>";
  static readonly SENDER_NAME = "Vadim Nicolai";
  static readonly EMAIL_DOMAIN = "vadim.blog";
}

/**
 * Email scheduling configuration
 */
export const EMAIL_SCHEDULE_CONFIG = {
  /** Hour of day to send (0-23), 8am UTC */
  sendHour: 8,
  /** Minimum delay between emails in minutes */
  minDelayMinutes: 2,
  /** Maximum delay between emails in minutes */
  maxDelayMinutes: 45,
  /** Maximum emails per day */
  maxPerDay: 30,
  /** Maximum scheduling window (Resend limit) */
  maxScheduleDays: 30,
} as const;
