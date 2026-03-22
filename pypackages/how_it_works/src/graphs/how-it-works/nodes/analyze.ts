import type { State } from "../graph.js";

// ─── DeepSeek call ───────────────────────────────────────────────────────────

async function chat(
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
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
      max_tokens: opts.maxTokens ?? 4_000,
      temperature: opts.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

// ─── Node ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior software architect performing a deep technical analysis of a web application codebase.

Analyze the provided source files and produce a comprehensive technical deep-dive covering:

1. **Purpose** — what problem does this app solve? Who uses it?
2. **Tech stack** — every framework, library, service, and tool (with versions where visible)
3. **Data flow** — step-by-step: how does data enter, get processed, get stored, and get returned?
4. **Architecture** — key structural decisions (App Router, server vs client components, monorepo role, etc.)
5. **Features** — each major feature and how it is technically implemented (name specific components, hooks, server actions, API routes)
6. **AI / LLM integration** — if any: which models, what prompts, embedding strategies, retrieval patterns
7. **Database & schema** — tables, columns, relationships, indexes, RPCs, migrations (if visible)
8. **API design** — key routes/endpoints, request/response shapes, auth patterns
9. **Auth & security** — authentication library, session handling, RLS policies, env secrets
10. **Unique patterns** — anything architecturally interesting or non-obvious
11. **Evaluation coverage** — test/eval frameworks used, what files exist in evals/, what they validate, coverage of critical paths
12. **Ingestion/processing pipelines** — Python services, FastAPI endpoints, parser chains, embedding strategies, batch processing
13. **Code patterns worth highlighting** — notable SQL queries, mathematical formulas, algorithms, search cascades, prompt engineering patterns

Rules:
- Be extremely specific: name actual files, functions, components, tables, API paths
- Explain HOW things work, not just WHAT exists
- If certain files are missing/truncated, say what you can infer and mark it clearly
- Do not pad with generic best-practice advice — only describe what is actually in the code`;

export async function analyzeNode(state: State): Promise<Partial<State>> {
  const app = state.currentApp!;

  console.log(`  🔬  Analyzing with DeepSeek...`);

  const filesText = state.currentFiles
    .map((f) => `### ${f.relativePath}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const analysis = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `App name: **${app.name}**\n\nSource files:\n\n${filesText}`,
      },
    ],
    { maxTokens: 6_000 }
  );

  if (state.verbose) {
    console.log("\n" + analysis.slice(0, 600) + "...\n");
  } else {
    console.log(`  ✓   Analysis done  (${analysis.length} chars)`);
  }

  return { currentAnalysis: analysis };
}
