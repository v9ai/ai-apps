export interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

export interface ApplicationContext {
  appliedAt?: string;
  status?: string;
}

export interface GenerateBatchEmailRequest {
  companyName?: string;
  instructions?: string;
  recipientCount?: number;
  jobContext?: JobContext;
  applicationContext?: ApplicationContext;
}

export interface GenerateBatchEmailResponse {
  subject: string;
  body: string;
}

export function buildBatchPrompt(input: GenerateBatchEmailRequest): string {
  const parts: string[] = [];

  // PRIMARY GOAL — instructions drive everything; must come first
  if (input.instructions) {
    parts.push(
      "PRIMARY GOAL (most important — the entire email must serve this):",
      input.instructions,
      "",
      "INTERPRETATION GUIDE:",
      "- If the goal mentions 'applied', 'application', 'no response', 'follow up', 'follow-up' → write a FOLLOW-UP email referencing a prior application, NOT a cold outreach.",
      "- If the goal is cold outreach → write an introduction email.",
      "- If the goal mentions a specific ask → make that the clear CTA.",
      "",
    );
  }

  // TARGET COMPANY
  if (input.companyName) {
    parts.push(`TARGET COMPANY: ${input.companyName}`, "");
  }

  // JOB CONTEXT
  if (input.jobContext?.title) {
    const { title, location, requiredSkills, description } = input.jobContext;
    parts.push("JOB CONTEXT:");
    parts.push(`- Role: ${title}`);
    if (location) {
      parts.push(`- Location: ${location}`);
    }
    if (requiredSkills && requiredSkills.length > 0) {
      parts.push(`- Required Skills: ${requiredSkills.join(", ")}`);
    }
    if (description) {
      parts.push(`- Description excerpt: ${description.slice(0, 500)}`);
    }
    parts.push("");
  }

  // APPLICATION HISTORY
  if (input.applicationContext) {
    const { appliedAt, status } = input.applicationContext;
    parts.push("APPLICATION HISTORY:");
    if (appliedAt) {
      parts.push(`- Applied: ${appliedAt}`);
    }
    if (status) {
      parts.push(`- Current status: ${status}`);
    }
    parts.push(
      '- Reference the timeline naturally (e.g. "I applied X weeks ago") — do NOT echo the raw status text.',
      "",
    );
  }

  // SENDER BACKGROUND
  parts.push(
    "SENDER BACKGROUND (use selectively — highlight ONLY skills that overlap with the job requirements):",
    "- Vadim Nicolai, Senior Software Engineer, 10+ years experience",
    "- Frontend: React, TypeScript, Next.js, Tailwind CSS",
    "- AI/ML: LLM integration, RAG pipelines, AI SDK, prompt engineering, LangChain",
    "- Backend: Node.js, GraphQL, REST APIs, PostgreSQL, SQLite",
    "- Systems: Rust, WebAssembly, Cloudflare Workers",
    "- Infrastructure: Docker, CI/CD, Vercel, Cloudflare",
    "- Seeking: fully remote EU engineering roles",
    "",
  );

  // ANTI-PATTERN RULES
  parts.push(
    "ANTI-PATTERN RULES (violations will be rejected):",
    "- NEVER echo raw text from the instructions field verbatim — interpret and rephrase.",
    '- NEVER include notification counts, status labels, or UI artifacts (e.g. "0 notifications", "Status: pending").',
    "- NEVER list skills that don't match the job requirements. If the job needs Python/ML and the sender knows TypeScript/React, mention transferable experience (e.g. \"AI SDK integration\", \"RAG pipelines\") instead.",
    "- NEVER fabricate recipient details, certifications, or experience the sender doesn't have.",
    "- If no job context is provided, keep skill mentions brief and general.",
    "",
  );

  // EXAMPLES
  parts.push(
    "EXAMPLES:",
    "",
    "Good follow-up (AI Engineer role requiring Python, ML):",
    JSON.stringify({
      subject: "Following up — AI Engineer application",
      body: 'Hey {{name}},\n\nI applied for the AI Engineer role a few weeks ago and wanted to follow up. I\'ve been building RAG pipelines and LLM integrations professionally — most recently a classification system processing thousands of job postings with structured output parsing.\n\nI\'d love to chat about how my experience with production AI systems could contribute to your team.\n\nThanks,\nVadim',
    }, null, 2),
    "",
    "Good cold outreach (Rust company):",
    JSON.stringify({
      subject: "Rust engineer interested in your team",
      body: "Hey {{name}},\n\nI came across your company and was impressed by your Rust-based infrastructure. I've been writing production Rust for the past two years — WebAssembly workers, async HTTP clients, and data pipelines.\n\nWould you be open to a quick chat about engineering opportunities on your team?\n\nThanks,\nVadim",
    }, null, 2),
    "",
  );

  // EMAIL TEMPLATE RULES
  parts.push(
    "EMAIL TEMPLATE RULES:",
    '1. Use {{name}} as the placeholder for the recipient\'s first name (start with "Hey {{name}},")',
    "2. 100-180 words MAX — be sharp and direct, cut all filler",
    "3. One clear CTA only",
    '4. End with "Thanks,\\nVadim"',
    "5. Do NOT fabricate recipient details",
    "",
    'Respond ONLY with valid JSON: { "subject": "...", "body": "..." }',
  );

  return parts.join("\n");
}

export function parseJsonContent(
  content: string,
): GenerateBatchEmailResponse | null {
  // Attempt 1: direct parse
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "subject" in parsed &&
      "body" in parsed &&
      typeof (parsed as Record<string, unknown>).subject === "string" &&
      typeof (parsed as Record<string, unknown>).body === "string"
    ) {
      return {
        subject: (parsed as Record<string, string>).subject,
        body: (parsed as Record<string, string>).body,
      };
    }
  } catch {
    /* fall through */
  }

  // Attempt 2: strip markdown code fences
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "subject" in parsed &&
      "body" in parsed &&
      typeof (parsed as Record<string, unknown>).subject === "string" &&
      typeof (parsed as Record<string, unknown>).body === "string"
    ) {
      return {
        subject: (parsed as Record<string, string>).subject,
        body: (parsed as Record<string, string>).body,
      };
    }
  } catch {
    /* fall through */
  }

  // Attempt 3: regex extraction
  const subjectMatch = content.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const bodyMatch = content.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/);

  if (subjectMatch?.[1] && bodyMatch?.[1]) {
    return {
      subject: subjectMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      body: bodyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
    };
  }

  return null;
}
