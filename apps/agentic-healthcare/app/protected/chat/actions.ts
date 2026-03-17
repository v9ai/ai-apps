"use server";

const CHAT_API = process.env.CHAT_API_URL ?? "http://localhost:8001";

export async function sendChatMessage(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const res = await fetch(`${CHAT_API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  return data.answer as string;
}
