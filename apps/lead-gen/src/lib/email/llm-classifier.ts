/**
 * LLM-based reply classifier — uses DeepSeek for accurate email classification.
 *
 * Primary classifier for inbound email replies. Falls back to logistic regression
 * (in reply-classifier.ts) when LLM is unavailable or errors.
 */

import OpenAI from "openai";
import { stripQuotedText, type ReplyClass, type ClassificationResult } from "./reply-classifier";
import { CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_FEW_SHOT } from "./classification-prompts";

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

const VALID_LABELS = new Set<ReplyClass>([
  "interested", "not_interested", "auto_reply", "bounced", "info_request", "unsubscribe",
]);

/**
 * Classify a reply using DeepSeek LLM with structured JSON output.
 *
 * @param subject - Email subject line
 * @param body - Email body text (will be stripped of quoted text)
 * @param threadContext - Optional context from the original outbound email
 */
export async function classifyReplyWithLLM(
  subject: string,
  body: string,
  threadContext?: string,
): Promise<ClassificationResult> {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const stripped = stripQuotedText(body);

  // Build user message with optional thread context
  let userMessage = `Subject: ${subject || "(no subject)"}\nBody: ${stripped}`;
  if (threadContext) {
    userMessage = `--- Original outbound email (for context) ---\n${threadContext}\n\n--- Inbound reply to classify ---\n${userMessage}`;
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
    ...CLASSIFICATION_FEW_SHOT,
    { role: "user", content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" } as any,
    temperature: 0.1,
    max_tokens: 256,
  });

  const content = res.choices?.[0]?.message?.content ?? "";

  const parsed = JSON.parse(content) as {
    label: string;
    confidence: number;
    reasoning?: string;
  };

  // Validate label
  const label = (parsed.label?.toLowerCase() ?? "interested") as ReplyClass;
  if (!VALID_LABELS.has(label)) {
    throw new Error(`Invalid classification label from LLM: ${parsed.label}`);
  }

  // Clamp confidence to [0, 1]
  const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));

  // Build scores map (LLM gives single label, so set others to 0)
  const scores = {} as Record<ReplyClass, number>;
  for (const l of VALID_LABELS) {
    scores[l] = l === label ? confidence : 0;
  }

  return { label, confidence, scores };
}
