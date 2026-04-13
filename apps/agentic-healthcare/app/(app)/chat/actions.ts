"use server";

import { withAuth } from "@/lib/auth-helpers";

const CHAT_API = process.env.CHAT_API_URL ?? process.env.PYTHON_API_URL ?? "http://localhost:8001";

export async function sendChatMessage(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const { userId } = await withAuth();
  const res = await fetch(`${CHAT_API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, user_id: userId }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Chat API failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return (data.answer ?? "") as string;
}
