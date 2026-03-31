import { NextRequest, NextResponse } from "next/server";
import { contentDb } from "@/src/db/content";
import { chatMessages } from "@/src/db/content-schema";
import { eq, asc, sql } from "drizzle-orm";
import { searchContent } from "@/lib/actions/search";
import { deepSearch } from "@/lib/actions/deep-search";

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

  // Load history + search context in parallel
  const [history, ftsResults, hybridResults] = await Promise.all([
    contentDb
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(50)
      .all(),
    searchContent(message).catch(() => []),
    deepSearch(message).catch(() => []),
  ]);

  let context = "";
  if (ftsResults.length > 0) {
    const parts = ftsResults.slice(0, 4).map((r) => {
      const label = r.lessonTitle && r.lessonTitle !== r.title
        ? `[${r.lessonTitle} > ${r.title}]`
        : `[${r.title}]`;
      return `${label}\n${r.snippet}`;
    });
    context = "\n\nRelevant knowledge base excerpts:\n" + parts.join("\n\n---\n\n");
  }

  // Append hybrid-matched lessons for broader semantic context
  if (hybridResults.length > 0) {
    const vectorParts = hybridResults
      .filter((r) => !context.includes(r.title))
      .slice(0, 4)
      .map((r) => `[${r.title}] (relevance: ${(r.combinedScore * 100).toFixed(0)}%)`);
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
  contentDb.insert(chatMessages).values([
    { threadId, role: "user", content: message },
    { threadId, role: "assistant", content: assistantContent },
  ]).run();

  return NextResponse.json({
    response: assistantContent,
    thread_id: threadId,
  });
}
