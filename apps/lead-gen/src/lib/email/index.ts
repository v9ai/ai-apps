/**
 * Email module — barrel exports
 */

export { EmailConfig, EMAIL_SCHEDULE_CONFIG } from "./config";
export {
  isEmailBounced,
  extractFirstName,
  personalizeEmailBody,
  textToHtml,
  textToStructuredHtml,
  sendAndSaveEmail,
  sendBatchAndSaveEmails,
} from "./utils";
export type {
  SendEmailParams,
  SendEmailResult,
  BatchSendEmailParams,
  BatchSendResult,
} from "./utils";
export {
  buildSchedule,
  getSchedulePreview,
  calculateSchedulingPlan,
} from "./scheduler";
export type {
  EmailToSchedule,
  ScheduledEmailEntry,
  ScheduleConfig,
  AdaptiveSchedulingConfig,
  SchedulingPlan,
} from "./scheduler";
export {
  generateCampaignSchedule,
  isBusinessDay,
  getScheduledSendTime,
  countBusinessDays,
} from "./campaign-scheduler";
export {
  findEmailsNeedingFollowUp,
  buildFollowUpInstructions,
  markEmailAsReplied,
} from "./followup";
export type { FollowUpConfig, FollowUpResult } from "./followup";
export * from "./signature";
export * from "./signature-react";
export * from "./render-signature";
export * from "./validator";
export * from "./subjects";
export * from "./contract";
export * from "./reply-types";
export * from "./reply-generation";
