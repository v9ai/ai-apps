import type { State } from "../graph.js";
import type { HowItWorksData } from "../types.js";

// ─── DeepSeek JSON call ──────────────────────────────────────────────────────

async function chatJson(messages: { role: string; content: string }[]): Promise<unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      max_tokens: 8_192,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string }; finish_reason: string }[];
  };

  const choice = data.choices[0];

  if (choice.finish_reason === "length") {
    console.log("  ⚠   JSON output was truncated (finish_reason=length), retrying with shorter prompt...");
    // Retry with an explicit instruction to shorten
    const retryMessages = [
      ...messages,
      { role: "assistant", content: choice.message.content },
      {
        role: "user",
        content:
          "Your JSON output was truncated. Produce a SHORTER version — use 1-2 sentence descriptions, " +
          "omit codeSnippet and codeBlock fields, limit to 3 technicalDetails and 4 extraSections. " +
          "Output ONLY the complete JSON.",
      },
    ];
    const retryRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: retryMessages,
        max_tokens: 8_192,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!retryRes.ok) {
      const text = await retryRes.text();
      throw new Error(`DeepSeek API retry ${retryRes.status}: ${text.slice(0, 400)}`);
    }
    const retryData = (await retryRes.json()) as {
      choices: { message: { content: string }; finish_reason: string }[];
    };
    return JSON.parse(retryData.choices[0].message.content);
  }

  return JSON.parse(choice.message.content);
}

// ─── Schema description injected into the prompt ─────────────────────────────

const SCHEMA = `
{
  "title": "How It Works",
  "subtitle": "One sentence that captures the technical approach — mention 2-3 key technologies",
  "story": "3-5 sentences: complete end-to-end user journey + technical flow, named tools/functions",
  "papers": [
    {
      "slug": "kebab-case-id",
      "number": 1,
      "title": "Technology or Concept Name",
      "category": "Frontend | Database | Authentication | AI/LLM | API | Infrastructure | Storage | Search | Build Tool | State Management | Evaluation | Research",
      "wordCount": 0,
      "readingTimeMin": 2,
      "authors": "Creator org (e.g. Vercel, Meta, Anthropic)",
      "year": 2024,
      "finding": "What makes this technology powerful — its core design principle or capability",
      "relevance": "How it is used in THIS specific app — mention actual component/function names",
      "url": "Official docs URL",
      "categoryColor": "var(--blue-9) | var(--green-9) | var(--purple-9) | var(--amber-9) | var(--orange-9) | var(--red-9) | var(--cyan-9) | var(--gray-9)"
    }
  ],
  "agents": [
    {
      "name": "Step Name",
      "description": "3-6 sentences with specific technical details — actual function/component names, data shapes, API calls",
      "researchBasis": "Underlying library or design pattern (optional)",
      "codeSnippet": "Key code pattern for this step (optional, actual code)",
      "dataFlow": "Data transformation: input → process → output (optional)"
    }
  ],
  "stats": [
    {
      "number": "e.g. '4', '1024-dim', 'O(log n)', '< 100ms'",
      "label": "Short description of what this number means",
      "source": "Where this fact comes from"
    }
  ],
  "technicalDetails": [
    {
      "type": "table | card-grid | code | diagram",
      "heading": "Section heading",
      "description": "Brief explanation (optional)",
      "items": [{"label": "...", "value": "...", "metadata": {"key": "val"}}],
      "code": "code block content (for type 'code' or 'diagram')"
    }
  ],
  "extraSections": [
    {
      "heading": "Section heading",
      "content": "3-5 sentences of technical deep-dive — actual table names, function names, security patterns",
      "codeBlock": "Optional code example"
    }
  ]
}
`.trim();

// ─── Category → color mapping (for the model to reference) ─────────────────

const COLOR_GUIDE = `
Category color guide:
- Frontend        → var(--blue-9)
- Database        → var(--green-9)
- Authentication  → var(--purple-9)
- AI/LLM          → var(--amber-9)
- API             → var(--orange-9)
- Infrastructure  → var(--red-9)
- Storage         → var(--cyan-9)
- Search          → var(--indigo-9)
- Build Tool      → var(--gray-9)
- State Management→ var(--teal-9)
- Evaluation      → var(--pink-9)
- Research        → var(--violet-9)
`.trim();

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You generate structured JSON for a HowItWorks React component that documents a web application.

The component renders:
- **papers** — "Technical Foundations": the key technologies/libraries/concepts the app is built on.
  Repurpose the Paper type — "title" = technology name, "finding" = its core capability,
  "relevance" = how THIS app uses it (be precise: name functions, routes, tables).
  Include 5–15 entries covering the most architecturally significant pieces.
- **agents** — "Pipeline Stages": 4–10 ordered steps showing how data flows through the system.
  Each step should name actual code artefacts (functions, components, server actions).
  Write 3-6 sentences, include codeSnippet with the key code pattern and dataFlow string.
- **stats** — 3–10 key technical metrics, counts, or architectural facts.
- **story** — a flowing 3–5 sentence narrative of the complete end-to-end journey.
- **extraSections** — 3–8 deep-dive sections. Always include at least:
  System Architecture, Database Design (if app has a DB), Security & Auth, Deployment & Infrastructure.
  Add AI Integration section if the app uses LLMs or embeddings.
- **technicalDetails** — 2–5 structured blocks for tables (e.g., clinical ratios, eval coverage),
  architecture breakdowns, API cascades, or code patterns. Use type "table" for key-value data,
  "card-grid" for related items, "code" for code examples, "diagram" for ASCII architecture diagrams.

${COLOR_GUIDE}

IMPORTANT: Keep descriptions concise (2-3 sentences max per agent/section). Keep codeSnippets to 3-5 lines.
The total JSON output MUST fit within 8000 tokens — be terse, avoid filler.

Output ONLY valid JSON matching this exact schema (no markdown fences, no extra keys):
${SCHEMA}`;

// ─── Node ────────────────────────────────────────────────────────────────────

export async function generateNode(state: State): Promise<Partial<State>> {
  const app = state.currentApp!;

  console.log(`  🏗   Generating HowItWorks data with DeepSeek...`);

  const raw = (await chatJson([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `App name: ${app.name}\n\nTechnical analysis:\n${state.currentAnalysis}`,
    },
  ])) as HowItWorksData;

  // Basic sanity checks
  if (!Array.isArray(raw.papers) || raw.papers.length === 0) {
    throw new Error(`Generate output for ${app.name} is missing papers array`);
  }

  console.log(
    `  ✓   Generated: ${raw.papers.length} foundations, ` +
      `${raw.agents?.length ?? 0} pipeline steps, ` +
      `${raw.stats?.length ?? 0} stats, ` +
      `${raw.extraSections?.length ?? 0} sections`
  );

  return { currentData: raw };
}
