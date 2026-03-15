import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { chatMessages } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";

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

  // Load conversation history (last 50 messages)
  const history = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(50);

  const messages = [
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
