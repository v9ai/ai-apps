import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { chatMessages } from "@/src/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY not configured" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const message = body.message;
  const threadId = body.thread_id || crypto.randomUUID();

  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  // Load history and retrieve FTS context in parallel — they're independent.
  type SearchRow = { title: string; snippet: string; lesson_title: string | null };
  const [history, searchResult] = await Promise.all([
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
  ]);

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

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: "DeepSeek API error", details: err },
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
