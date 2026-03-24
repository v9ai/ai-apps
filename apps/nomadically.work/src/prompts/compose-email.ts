/**
 * Prompt builder for single-email compose (LinkedIn → outreach flow).
 *
 * Used by: /api/emails/generate-stream
 * Tested via: pnpm test:email-evals
 */

import resumeData from "@/apollo/resolvers/resume/resume-data.json";

export interface ComposeEmailInput {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
  linkedinPostContent?: string;
}

function buildSenderBackground(): string {
  const { basics, work, activities, volunteer } = resumeData;

  const mostRecent = work[0];
  const aiProjects = activities.aiProjects;
  const oss = volunteer[0];

  const lines: string[] = [
    `- ${basics.name}, ${basics.label} — ${basics.summary}`,
    "",
    "SKILLS (highlight only what overlaps with the job/context):",
    "- Frontend: React, TypeScript, Next.js, JavaScript",
    "- AI/ML: LLM integration, RAG pipelines, AI SDK, prompt engineering, multi-agent orchestration",
    "- Backend: Node.js, Go, GraphQL, Apollo, REST APIs, gRPC, microservices",
    "- Systems: Rust, WebAssembly, Cloudflare Workers",
    "- Infra: AWS, Cloudflare, Docker, CI/CD, Turborepo",
    "- Databases: MongoDB, DynamoDB, PostgreSQL, SQLite, D1",
    "",
    `MOST RECENT ROLE: ${mostRecent.position} @ ${mostRecent.name} (${mostRecent.startDate} – ${mostRecent.endDate})`,
  ];

  // Strip HTML tags from summary for plain text
  const recentSummary = mostRecent.summary
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  lines.push(`  ${recentSummary.slice(0, 400)}`);

  if (aiProjects.length > 0) {
    lines.push("", "AI PROJECTS — NCA IT Ltd (use selectively to demonstrate practical AI experience):");
    for (const proj of aiProjects) {
      lines.push(`- ${proj.name}: ${proj.description}`);
    }
  }

  if (oss) {
    const ossSummary = oss.summary
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    lines.push(
      "",
      `OPEN SOURCE: ${oss.position} @ ${oss.organization} (${oss.startDate} – present)`,
      `  ${ossSummary.slice(0, 300)}`,
    );
  }

  lines.push("", "SEEKING: fully remote EU engineering roles");

  return lines.join("\n");
}

const SENDER_BACKGROUND = buildSenderBackground();

export function buildComposePrompt(input: ComposeEmailInput): string {
  const firstName = input.recipientName.split(" ")[0] || input.recipientName;

  return `You are helping ${resumeData.basics.name} craft a personalized outreach email.

RECIPIENT DETAILS:
- Name: ${input.recipientName} (use "${firstName}" in greeting)
${input.companyName ? `- Company: ${input.companyName}` : ""}
${input.recipientContext ? `- Context: ${input.recipientContext}` : ""}

SENDER BACKGROUND:
${SENDER_BACKGROUND}

${input.instructions ? `SPECIAL INSTRUCTIONS (CRITICAL):\n${input.instructions}\n` : ""}${input.linkedinPostContent ? `LINKEDIN POST CONTEXT:\nThe recipient recently shared this on LinkedIn:\n---\n${input.linkedinPostContent}\n---\nReference their post naturally — show genuine interest in their perspective. Do NOT quote verbatim or sound like you scraped their content.\n` : ""}REQUIREMENTS:
1. Generate a professional email
2. Start with "Hey ${firstName},"
3. Keep it concise (150-300 words)
4. Highlight ONLY skills that are relevant to the recipient's context or company
5. Include a clear CTA
6. End with "Thanks,\\nVadim"
7. Do NOT make up facts about the recipient or claim skills/credentials not listed above

Generate the email as a JSON object:
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}`;
}
