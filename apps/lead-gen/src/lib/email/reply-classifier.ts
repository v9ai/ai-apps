/**
 * Reply classifier — logistic regression inference in TypeScript.
 *
 * Extracts a 16-element feature vector from email subject+body, then runs
 * 6 independent binary logistic regressions (OvR) to classify the reply.
 *
 * When trained weights exist (~/.lance/linkedin/reply_classifier_weights.json),
 * they are loaded at module init. Otherwise falls back to pure keyword rules.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Types ────────────────────────────────────────────────────────────────────

export type ReplyClass =
  | "interested"
  | "not_interested"
  | "auto_reply"
  | "bounced"
  | "info_request"
  | "unsubscribe";

export interface ClassificationResult {
  label: ReplyClass;
  confidence: number;
  scores: Record<ReplyClass, number>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LABEL_NAMES: ReplyClass[] = [
  "interested",
  "not_interested",
  "auto_reply",
  "bounced",
  "info_request",
  "unsubscribe",
];

const NUM_FEATURES = 16;

// ── Keyword lists (must match Python export_reply_labels.py) ─────────────────

const INTERESTED_KW = [
  "sounds great", "let's chat", "let's talk", "interested",
  "love to learn more", "would love to", "tell me more",
  "set up a call", "schedule a call", "book a time",
  "can we meet", "looking forward", "exciting",
  "count me in", "sign me up", "yes please",
  "absolutely", "definitely interested", "happy to connect",
];

const NOT_INTERESTED_KW = [
  "not interested", "no thanks", "no thank you", "pass on this",
  "not a fit", "not a good fit", "not the right time",
  "already have a solution", "not looking", "please don't contact",
  "we're all set", "not in the market", "decline",
  "not for us", "we'll pass", "no need",
];

const AUTO_REPLY_KW = [
  "out of office", "out of the office", "ooo", "auto-reply",
  "automatic reply", "autoreply", "currently away",
  "away from my desk", "on vacation", "on holiday",
  "limited access to email", "will respond when i return",
  "maternity leave", "paternity leave", "sabbatical",
  "delayed response", "i am currently unavailable",
];

const BOUNCED_KW = [
  "delivery failed", "undeliverable", "mail delivery",
  "mailbox full", "mailbox not found", "user unknown",
  "address rejected", "does not exist", "no such user",
  "delivery status notification", "permanent failure",
  "message not delivered", "returned mail",
  "550 ", "551 ", "552 ", "553 ", "554 ",
];

const INFO_REQUEST_KW = [
  "can you send", "could you share", "more details",
  "more information", "tell me more about",
  "what does this include", "how does it work",
  "pricing", "case study", "demo", "brochure",
  "send me", "forward me", "share some",
];

const UNSUBSCRIBE_KW = [
  "unsubscribe", "remove me", "opt out", "opt-out",
  "stop emailing", "stop sending", "take me off",
  "remove from list", "remove from your list",
  "do not contact", "do not email", "don't email",
  "please remove", "gdpr", "cease",
];

const CALENDAR_PATTERNS = [
  "calendly.com", "cal.com", "savvycal.com", "tidycal.com", "hubspot.com/meetings",
];

const SIGNATURE_PATTERNS = [
  "sent from my iphone", "sent from my android", "sent from outlook",
  "get outlook", "--\n", "best regards", "kind regards", "sincerely", "cheers,",
];

const GREETING_PATTERNS = ["hi ", "hey ", "hello ", "thanks ", "thank you", "dear "];

// ── Feature extraction ───────────────────────────────────────────────────────

function kwDensity(text: string, keywords: string[], wordCount: number): number {
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) hits++;
  }
  return hits / wordCount;
}

export function extractFeatures(subject: string, body: string): number[] {
  const combined = `${subject} ${body}`.toLowerCase();
  const words = combined.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(words.length, 1);

  const questionCount = (combined.match(/\?/g) || []).length;
  const exclamationCount = (combined.match(/!/g) || []).length;

  return [
    // 0-5: keyword densities per class
    kwDensity(combined, INTERESTED_KW, wordCount),
    kwDensity(combined, NOT_INTERESTED_KW, wordCount),
    kwDensity(combined, AUTO_REPLY_KW, wordCount),
    kwDensity(combined, BOUNCED_KW, wordCount),
    kwDensity(combined, INFO_REQUEST_KW, wordCount),
    kwDensity(combined, UNSUBSCRIBE_KW, wordCount),
    // 6: text_length_norm
    Math.min(combined.length / 2000, 1.0),
    // 7: subject_is_re
    /^re:\s/i.test(subject || "") ? 1.0 : 0.0,
    // 8: has_question_mark
    questionCount > 0 ? 1.0 : 0.0,
    // 9: question_density
    questionCount / wordCount,
    // 10: exclamation_density
    exclamationCount / wordCount,
    // 11: word_count_norm
    Math.min(wordCount / 300, 1.0),
    // 12: has_calendar_link
    CALENDAR_PATTERNS.some((p) => combined.includes(p)) ? 1.0 : 0.0,
    // 13: has_signature_block
    SIGNATURE_PATTERNS.some((p) => combined.includes(p)) ? 1.0 : 0.0,
    // 14: is_short_reply
    wordCount < 20 ? 1.0 : 0.0,
    // 15: greeting_present
    GREETING_PATTERNS.some((p) => combined.startsWith(p) || combined.includes(`\n${p}`))
      ? 1.0
      : 0.0,
  ];
}

// ── Logistic regression inference ────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1.0 / (1.0 + Math.exp(-x));
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// ── Weights loading ──────────────────────────────────────────────────────────

interface ModelWeights {
  weights: number[][]; // [6][16]
  biases: number[]; // [6]
  trained: boolean;
}

let loadedWeights: ModelWeights | null = null;

function loadWeights(): ModelWeights | null {
  if (loadedWeights !== null) return loadedWeights;

  const weightsPath = join(homedir(), ".lance", "linkedin", "reply_classifier_weights.json");
  if (!existsSync(weightsPath)) {
    return null;
  }

  try {
    const raw = readFileSync(weightsPath, "utf-8");
    const parsed = JSON.parse(raw) as ModelWeights;
    if (
      parsed.trained &&
      Array.isArray(parsed.weights) &&
      parsed.weights.length === LABEL_NAMES.length &&
      Array.isArray(parsed.biases) &&
      parsed.biases.length === LABEL_NAMES.length
    ) {
      loadedWeights = parsed;
      return parsed;
    }
  } catch {
    // Fall through to keyword-only mode
  }
  return null;
}

// ── Keyword-only fallback ────────────────────────────────────────────────────

function classifyByKeywords(subject: string, body: string): ClassificationResult {
  const features = extractFeatures(subject, body);

  // Use keyword density features (indices 0-5) directly as scores
  const scores: Record<ReplyClass, number> = {
    interested: features[0],
    not_interested: features[1],
    auto_reply: features[2],
    bounced: features[3],
    info_request: features[4],
    unsubscribe: features[5],
  };

  // Calendar link boost
  if (features[12] > 0) {
    scores.interested += 0.5;
  }

  // Negation priority: "not interested" contains "interested" as substring,
  // so both match. Specific negation should suppress generic positive.
  if (scores.not_interested > 0 && scores.interested > 0) {
    scores.interested = 0;
  }
  if (scores.unsubscribe > 0 && scores.interested > 0) {
    scores.interested = 0;
  }

  let best: ReplyClass = "not_interested";
  let bestScore = 0;

  for (const label of LABEL_NAMES) {
    if (scores[label] > bestScore) {
      best = label;
      bestScore = scores[label];
    }
  }

  // If no keywords matched, use structural heuristics
  if (bestScore === 0) {
    const wordCount = Math.max(`${subject} ${body}`.split(/\s+/).length, 1);
    if (wordCount < 20 && /^re:\s/i.test(subject || "")) {
      best = "info_request";
    }
  }

  return { label: best, confidence: Math.min(bestScore * 10, 1.0), scores };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function classifyReply(subject: string, body: string): ClassificationResult {
  const weights = loadWeights();

  if (!weights) {
    return classifyByKeywords(subject, body);
  }

  const features = extractFeatures(subject, body);
  const scores = {} as Record<ReplyClass, number>;

  for (let i = 0; i < LABEL_NAMES.length; i++) {
    const z = dotProduct(features, weights.weights[i]) + weights.biases[i];
    scores[LABEL_NAMES[i]] = sigmoid(z);
  }

  let best: ReplyClass = "not_interested";
  let bestScore = 0;

  for (const label of LABEL_NAMES) {
    if (scores[label] > bestScore) {
      best = label;
      bestScore = scores[label];
    }
  }

  return { label: best, confidence: bestScore, scores };
}

export function reloadWeights(): void {
  loadedWeights = null;
  loadWeights();
}
