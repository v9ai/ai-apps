/**
 * Reply type instructions for email generation
 */
export const REPLY_TYPE_INSTRUCTIONS = {
  polite_decline:
    "Politely decline the opportunity or request. Keep it brief, professional, and leave the door open for future opportunities.",
  interested:
    "Express genuine interest in the opportunity. Ask for more details and suggest next steps (call, meeting, or more information).",
  interested_also_in_permanent:
    "Express genuine interest in the opportunity. Mention that while you're primarily looking for contract roles, you're also open to permanent positions for the right opportunity. Ask for more details and suggest next steps (call, meeting, or more information).",
  attach_cv:
    "Express interest and mention that you're attaching your CV for their review. Keep it professional and suggest next steps for discussion.",
  follow_up_2weeks:
    "Acknowledge their message and politely ask if it would be okay to follow up in 1 week. Keep it brief and professional.",
  follow_up_1month:
    "Acknowledge their message and politely ask if it would be okay to follow up in 1 month. Keep it brief and professional.",
  request_more_info:
    "Express interest and ask for more specific details about the opportunity (role details, tech stack, team size, compensation range, etc.).",
  thank_you:
    "Send a genuine thank you message. Be warm and appreciative while keeping it concise.",
} as const;

export type ReplyType = keyof typeof REPLY_TYPE_INSTRUCTIONS;

export const REPLY_TYPES = {
  POLITE_DECLINE: "polite_decline",
  INTERESTED: "interested",
  INTERESTED_ALSO_IN_PERMANENT: "interested_also_in_permanent",
  ATTACH_CV: "attach_cv",
  FOLLOW_UP_2WEEKS: "follow_up_2weeks",
  FOLLOW_UP_1MONTH: "follow_up_1month",
  REQUEST_MORE_INFO: "request_more_info",
  THANK_YOU: "thank_you",
} as const;

export const REPLY_TYPE_OPTIONS = [
  { value: "polite_decline", label: "Polite Decline" },
  { value: "interested", label: "Interested" },
  {
    value: "interested_also_in_permanent",
    label: "Interested (Also Open to Permanent)",
  },
  { value: "attach_cv", label: "Attach CV" },
  { value: "follow_up_2weeks", label: "Follow-up in 1 Week" },
  { value: "follow_up_1month", label: "Follow-up in 1 Month" },
  { value: "request_more_info", label: "Request More Info" },
  { value: "thank_you", label: "Thank You" },
] as const;
