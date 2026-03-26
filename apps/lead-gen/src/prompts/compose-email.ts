/**
 * Prompt builder for single-email compose (LinkedIn → outreach flow).
 *
 * Used by: /api/emails/generate-stream
 * Tested via: pnpm test:email-evals
 */

export interface ComposeEmailInput {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
  linkedinPostContent?: string;
}

const SENDER_NAME = "Vadim Nicolai";

const SENDER_BACKGROUND = `- ${SENDER_NAME}, Senior Full Stack Engineer — 12+ years building scalable web apps with React, TypeScript, Go, and Rust. 4 AI-powered projects with multi-model LLM orchestration, agentic pipelines, RAG search, eval-driven development.

SKILLS (highlight only what overlaps with the job/context):
- Frontend: React, TypeScript, Next.js, JavaScript
- AI/ML: LLM integration, RAG pipelines, AI SDK, prompt engineering, multi-agent orchestration
- Backend: Node.js, Go, GraphQL, Apollo, REST APIs, gRPC, microservices
- Systems: Rust, WebAssembly, Cloudflare Workers
- Infra: AWS, Cloudflare, Docker, CI/CD, Turborepo
- Databases: MongoDB, DynamoDB, PostgreSQL, SQLite, D1

MOST RECENT ROLE: Senior Full Stack Engineer @ Vitrifi (March 2022 – December 2025)
  Architected micro-frontend portal using Go microservices with gRPC and OpenAPI. Led API migration from REST to GraphQL. Drove frontend architecture and technical leadership across teams.

AI PROJECTS — NCA IT Ltd:
- Agentic Healthcare: Clinical biomarker trajectory analysis, AI-driven risk classification with cosine embedding similarity, pgvector search, automated accuracy evals with Braintrust.
- Knowledge: Knowledge graph with pgvector cosine similarity search, Bayesian mastery tracing, DeepEval RAG triad, LangGraph multi-agent editorial pipeline.
- ResearchThera.com: Multi-agent orchestration with LLM quality gating, clinical research ingestion from 7 sources, RAG-powered vector search, runtime prompt versioning.
- Law Adversarial: 6-agent adversarial debate pipeline with citation verification and fabrication detection, red-teaming and safety evals.

OPEN SOURCE: Open-Source Contributor @ Nautilus Trader (April 2025 – present)
  Contributed 100+ PRs to core trading engine in Rust and Python. Built production exchange adapters for dYdX v4 and Hyperliquid.

SEEKING: fully remote EU engineering roles`;

export function buildComposePrompt(input: ComposeEmailInput): string {
  const firstName = input.recipientName.split(" ")[0] || input.recipientName;

  return `You are helping ${SENDER_NAME} craft a personalized outreach email.

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
