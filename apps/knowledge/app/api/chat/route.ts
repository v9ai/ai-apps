import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { chatMessages } from "@/src/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { embed } from "@/lib/embeddings";

const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const LLM_MODEL =
  process.env.LLM_MODEL || "qwen2.5:7b-instruct-q4_K_M";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

export async function POST(req: NextRequest) {

  const body = await req.json();
  const message = body.message;
  const threadId = body.thread_id || crypto.randomUUID();

  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  // Load history, FTS context, and (optionally) vector context in parallel.
  type SearchRow = { title: string; snippet: string; lesson_title: string | null };
  type VectorRow = { slug: string; title: string; category_name: string; combined_score: number };

  // Try to embed for hybrid search — falls back to FTS-only if no OPENAI_API_KEY
  const embeddingPromise = embed(message).catch(() => null);

  const [history, searchResult, queryEmbedding] = await Promise.all([
    db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(50),
    db
      .execute<SearchRow>(
        sql`SELECT title, snippet, lesson_title FROM search_content(${message}, ${4})`,
      )
      .catch(() => null),
    embeddingPromise,
  ]);

  // If we have an embedding, also run hybrid search for better semantic results
  let hybridResult: { rows: VectorRow[] } | null = null;
  if (queryEmbedding) {
    const vecLiteral = `[${queryEmbedding.join(",")}]`;
    hybridResult = await db
      .execute<VectorRow>(
        sql`SELECT slug, title, category_name, combined_score
            FROM hybrid_search_lessons(
              ${message},
              ${sql.raw(`'${vecLiteral}'::vector(1024)`)},
              4, 0.3, 0.7, 0.2
            )`,
      )
      .catch(() => null);
  }

  let context = "";
  if (searchResult && searchResult.rows.length > 0) {
    const parts = searchResult.rows.map((r) => {
      const label = r.lesson_title && r.lesson_title !== r.title
        ? `[${r.lesson_title} > ${r.title}]`
        : `[${r.title}]`;
      return `${label}\n${r.snippet}`;
    });
    context = "\n\nRelevant knowledge base excerpts:\n" + parts.join("\n\n---\n\n");
  }

  // Append vector-matched lessons for broader semantic context
  if (hybridResult && hybridResult.rows.length > 0) {
    const vectorParts = hybridResult.rows
      .filter((r) => !context.includes(r.title)) // avoid duplicates with FTS
      .map((r) => `[${r.title}] (${r.category_name}, relevance: ${(r.combined_score * 100).toFixed(0)}%)`);
    if (vectorParts.length > 0) {
      context += "\n\nSemantically related lessons:\n" + vectorParts.join("\n");
    }
  }

  const systemPrompt = {
    role: "system",
    content:
      "You are an AI engineering tutor for a knowledge base covering transformers, RAG, agents, fine-tuning, evaluations, infrastructure, safety, and multimodal AI. " +
      "Answer questions concisely and accurately. Cite specific architectures or lesson topics when relevant. " +
      "When context excerpts are provided, base your answer on them and cite the lesson title. " +
      "If a question is outside AI/ML engineering, politely redirect the conversation back to the subject matter." +
      context,
  };

  const messages = [
    systemPrompt,
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LLM_API_KEY && { Authorization: `Bearer ${LLM_API_KEY}` }),
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: "LLM API error", details: err },
      { status: response.status },
    );
  }

  const data = await response.json();
  const assistantContent = data.choices?.[0]?.message?.content ?? "";

  // Save user + assistant messages
  await db.insert(chatMessages).values([
    { threadId, role: "user", content: message },
    { threadId, role: "assistant", content: assistantContent },
  ]);

  return NextResponse.json({
    response: assistantContent,
    thread_id: threadId,
  });
}
