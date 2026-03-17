import type { MutationResolvers } from "./../../types.generated";
import { getContactFeedback, saveExtractedIssues, saveIssuesToTable } from "@/src/db";

const DASHSCOPE_BASE =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = "qwen-plus";

export const extractContactFeedbackIssues: NonNullable<MutationResolvers['extractContactFeedbackIssues']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY not configured");
  }

  const fb = await getContactFeedback(args.id, userEmail);
  if (!fb) {
    throw new Error("Contact feedback not found");
  }

  const systemPrompt = `You are an expert educational psychologist and child development specialist. Analyze the following feedback about a child and extract specific issues, concerns, or areas that need attention.

CRITICAL: You MUST write ALL text fields (title, description) in the SAME LANGUAGE as the original feedback. If the feedback is in Romanian, write in Romanian. If in English, write in English. Match the language exactly.

For each issue, provide:
- title: A short descriptive title (in the same language as the feedback)
- description: A detailed explanation of the issue based ONLY on what is explicitly stated in the feedback. Describe observed behaviors, not interpretations. Do NOT introduce diagnostic labels, clinical terminology, or disorder names unless they appear in the original feedback. (in the same language as the feedback)
- category: MUST be exactly one of these values: academic, behavioral, social, emotional, developmental, health, communication, other. No other values are allowed. Use "health" for physical/motor issues. (keep category values in English)
- severity: MUST be exactly one of: low, medium, high. Use "high" for issues significantly impacting daily functioning. (keep severity values in English)

Important:
- Use objective, non-judgmental language throughout
- Distinguish between what was observed and any interpretation
- Do NOT diagnose or imply diagnoses
- Keep descriptions grounded in the feedback text
- ALL human-readable text MUST be in the same language as the original feedback
- Do NOT include recommendations

Return ONLY a JSON array of issues. No markdown, no explanation, just the JSON array.

Example:
[
  {
    "title": "Difficulty with reading comprehension",
    "description": "The child struggles to understand and retain information from texts, particularly narrative passages.",
    "category": "academic",
    "severity": "medium"
  }
]`;

  const userPrompt = `Analyze this feedback and extract all issues:\n\n${fb.subject ? `Subject: ${fb.subject}\n` : ""}${fb.source ? `Source: ${fb.source}\n` : ""}Date: ${fb.feedbackDate}\n\nContent:\n${fb.content}`;

  const response = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "[extractContactFeedbackIssues] Qwen API error:",
      response.status,
      errorBody,
    );
    throw new Error(`Qwen API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from Qwen");
  }

  // Parse the JSON response, stripping any markdown fences
  let issues: unknown[];
  try {
    const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
    issues = JSON.parse(cleaned);
    if (!Array.isArray(issues)) {
      throw new Error("Expected array");
    }
  } catch {
    throw new Error("Failed to parse extracted issues from Qwen response");
  }

  // Save to DB - both legacy JSON field and new issues table
  await saveExtractedIssues(args.id, userEmail, issues);
  await saveIssuesToTable(args.id, fb.familyMemberId, userEmail, issues);

  // Re-fetch the updated record
  const updated = await getContactFeedback(args.id, userEmail);
  if (!updated) {
    throw new Error("Feedback not found after extraction");
  }

  return {
    id: updated.id,
    contactId: updated.contactId,
    familyMemberId: updated.familyMemberId,
    createdBy: updated.userId,
    subject: updated.subject,
    feedbackDate: updated.feedbackDate,
    content: updated.content,
    tags: updated.tags,
    source: updated.source as any,
    extracted: updated.extracted,
    extractedIssues: updated.extractedIssues,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  } as any;
};
