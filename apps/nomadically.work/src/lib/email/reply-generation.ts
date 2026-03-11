import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { REPLY_TYPE_INSTRUCTIONS, type ReplyType } from "./reply-types";

export interface GenerateReplyRequest {
  originalEmailContent: string;
  originalSender: string;
  additionalDetails?: string | null;
  instructions?: string | null;
  tone?: string | null;
  replyType?: string | null;
  includeCalendly?: boolean | null;
}

export interface GenerateReplyResult {
  subject: string;
  body: string;
}

function buildReplySystemPrompt(tone?: string | null): string {
  const toneDescription = tone || "professional";

  return `You are an expert email writer helping Vadim Nicolai craft thoughtful email replies.

Your role is to generate ${toneDescription} replies that:
1. Acknowledge and address points from the original email
2. Are concise and to the point
3. Feel personal and genuine
4. Include specific details when requested
5. Have a clear next step or response

Background on Vadim:
- Senior Frontend Engineer with 10+ years experience
- Currently contributing to Nautech Systems open source trading engine
- Built production exchange adapters for dYdX v4 and Hyperliquid in Rust
- Expertise in React, TypeScript, Rust, and trading systems
- Looking for opportunities in crypto/DeFi

Format requirements:
- Start with a greeting using only the first name from the original sender
- Keep paragraphs short and scannable
- Reference specific points from the original email when relevant
- End with a clear next step
- Sign off as "Vadim"
- Be responsive to the original email's tone and content`;
}

function buildReplyUserPrompt(input: GenerateReplyRequest): string {
  const parts: string[] = [];

  parts.push("Generate a reply to the following email:");
  parts.push(`\n--- Original Email ---`);
  parts.push(`From: ${input.originalSender}`);
  parts.push(`Content:\n${input.originalEmailContent}`);
  parts.push(`--- End Original Email ---\n`);

  if (input.replyType) {
    const instruction = REPLY_TYPE_INSTRUCTIONS[input.replyType as ReplyType];
    if (instruction) {
      parts.push(`REPLY TYPE INSTRUCTION (must follow this):\n${instruction}`);
    }
  }

  if (input.additionalDetails) {
    parts.push(
      `Additional details to include in the reply:\n${input.additionalDetails}`,
    );
  }

  if (input.instructions) {
    parts.push(
      `IMPORTANT - Special Instructions (must follow these carefully):\n${input.instructions}`,
    );
  }

  if (input.includeCalendly) {
    parts.push(
      `IMPORTANT - Include Calendly link:\nWhen suggesting a call or meeting, naturally include: "You can book a convenient time via my Calendly: https://calendly.com/nicolad"`,
    );
  }

  parts.push(`
Generate a subject line and reply body in the following format:

Subject: Re: [maintain or improve the original subject]

Body: [your reply body here]

The reply should:
- Be at least 150 characters
- Start with an appropriate greeting
- Address key points from the original email
- Include the additional details if provided
- Have a clear next step or call to action
- End with "Thanks,\\nVadim" or "Best,\\nVadim" as appropriate${
    input.instructions
      ? "\n- ENSURE you incorporate the special instructions above"
      : ""
  }`);

  return parts.join("\n\n");
}

/**
 * Generate reply content using Claude
 */
export async function generateReplyContent(
  input: GenerateReplyRequest,
): Promise<GenerateReplyResult> {
  const systemPrompt = buildReplySystemPrompt(input.tone);
  const userPrompt = buildReplyUserPrompt(input);

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Parse the response to extract subject and body
  const subjectMatch = text.match(/Subject:\s*(.+?)(?:\n|$)/i);
  const bodyMatch = text.match(/Body:\s*([\s\S]+?)(?:\n\n---|\n\nSubject:|$)/i);

  if (!subjectMatch || !bodyMatch) {
    const lines = text.split("\n").filter((line) => line.trim());
    const subject =
      lines[0]?.replace(/^(Subject:|##|Re:)\s*/i, "").trim() ||
      "Re: Your email";
    const body = lines.slice(1).join("\n").trim() || text;

    return { subject: `Re: ${subject}`, body };
  }

  return {
    subject: subjectMatch[1].trim(),
    body: bodyMatch[1].trim(),
  };
}
