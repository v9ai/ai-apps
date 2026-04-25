/**
 * LLM-based reply classifier.
 *
 * Tries local Qwen (mlx_lm.server) first, then DeepSeek API.
 * Falls back to logistic regression (reply-classifier.ts) via classifyReplyHybrid().
 */

import OpenAI from "openai";
import { getDeepSeekClient, getDeepSeekModel, isDeepSeekConfigured } from "@/lib/deepseek/client";
import { stripQuotedText, type ReplyClass, type ClassificationResult } from "./reply-classifier";
import { CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_FEW_SHOT } from "./classification-prompts";

function getLocalClient(): OpenAI | null {
  const url = process.env.LLM_BASE_URL;
  if (!url) return null;
  return new OpenAI({ apiKey: "local", baseURL: url });
}

const VALID_LABELS = new Set<ReplyClass>([
  "interested", "not_interested", "auto_reply", "bounced", "info_request", "unsubscribe",
]);

function buildMessages(
  subject: string,
  body: string,
  threadContext?: string,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const stripped = stripQuotedText(body);
  let userMessage = `Subject: ${subject || "(no subject)"}\nBody: ${stripped}`;
  if (threadContext) {
    userMessage = `--- Original outbound email (for context) ---\n${threadContext}\n\n--- Inbound reply to classify ---\n${userMessage}`;
  }
  return [
    { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
    ...CLASSIFICATION_FEW_SHOT,
    { role: "user", content: userMessage },
  ];
}

function parseResponse(content: string): ClassificationResult {
  const parsed = JSON.parse(content) as {
    label: string;
    confidence: number;
    reasoning?: string;
  };

  const label = (parsed.label?.toLowerCase() ?? "interested") as ReplyClass;
  if (!VALID_LABELS.has(label)) {
    throw new Error(`Invalid classification label from LLM: ${parsed.label}`);
  }

  const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));
  const scores = {} as Record<ReplyClass, number>;
  for (const l of VALID_LABELS) {
    scores[l] = l === label ? confidence : 0;
  }
  return { label, confidence, scores };
}

async function callLLM(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<ClassificationResult> {
  const res = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" } as any,
    temperature: 0.1,
    max_tokens: 256,
  });
  return parseResponse(res.choices?.[0]?.message?.content ?? "");
}

/**
 * Classify using local Qwen first, then DeepSeek. Throws if both fail.
 */
export async function classifyReplyWithLLM(
  subject: string,
  body: string,
  threadContext?: string,
): Promise<ClassificationResult> {
  const messages = buildMessages(subject, body, threadContext);

  const localClient = getLocalClient();
  if (localClient) {
    try {
      const model = process.env.LLM_MODEL ?? "mlx-community/Qwen2.5-3B-Instruct-4bit";
      return await callLLM(localClient, model, messages);
    } catch {
      // fall through to DeepSeek
    }
  }

  if (!isDeepSeekConfigured()) throw new Error("No LLM available (LLM_BASE_URL and DEEPSEEK_API_KEY both unset)");
  return await callLLM(getDeepSeekClient(), getDeepSeekModel(), messages);
}
