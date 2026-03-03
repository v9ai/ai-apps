"use server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import OpenAI from "openai";
import { redirect } from "next/navigation";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function searchBloodTests(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_blood_tests", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) throw new Error(error.message);
  return data as Array<{
    id: string;
    test_id: string;
    content: string;
    similarity: number;
  }>;
}

export async function askHealthQuestion(question: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const results = await searchBloodTests(question);

  if (results.length === 0) {
    return {
      answer:
        "I couldn't find any blood test results relevant to your question. Please upload some blood tests first.",
      sources: [],
    };
  }

  const context = results
    .map((r, i) => `--- Test ${i + 1} (similarity: ${r.similarity.toFixed(2)}) ---\n${r.content}`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful health assistant analyzing blood test results. You provide clear, factual observations about lab values. Always note when values are outside reference ranges. Remind the user to consult their doctor for medical advice. Do not diagnose conditions — only describe what the numbers show.`,
      },
      {
        role: "user",
        content: `Based on these blood test results:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  return {
    answer: completion.choices[0].message.content ?? "",
    sources: results.map((r) => ({
      testId: r.test_id,
      similarity: r.similarity,
    })),
  };
}
