"use server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, qwen } from "@/lib/embeddings";
import { redirect } from "next/navigation";

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
    file_name: string;
    test_date: string | null;
  }>;
}

export async function searchMarkers(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_markers", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
  });

  if (error) throw new Error(error.message);
  return data as Array<{
    id: string;
    marker_id: string;
    test_id: string;
    marker_name: string;
    content: string;
    similarity: number;
  }>;
}

async function searchConditions(embedding: number[]) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_conditions", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    condition_id: string;
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

  const embedding = await generateEmbedding(question);

  // Search blood tests and conditions in parallel
  const [testResults, conditionResults] = await Promise.all([
    supabase
      .rpc("match_blood_tests", {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.3,
        match_count: 5,
      })
      .then((r) => (r.data ?? []) as Array<{
        id: string;
        test_id: string;
        content: string;
        similarity: number;
        file_name: string;
        test_date: string | null;
      }>),
    searchConditions(embedding),
  ]);

  if (testResults.length === 0 && conditionResults.length === 0) {
    return {
      answer:
        "I couldn't find any blood test results or conditions relevant to your question. Please upload some blood tests or add your health conditions first.",
      sources: [],
      conditions: [],
    };
  }

  let context = "";

  if (testResults.length > 0) {
    context += "=== BLOOD TEST RESULTS ===\n\n";
    context += testResults
      .map(
        (r, i) =>
          `--- Test ${i + 1} (similarity: ${r.similarity.toFixed(2)}) ---\n${r.content}`
      )
      .join("\n\n");
  }

  if (conditionResults.length > 0) {
    context += "\n\n=== KNOWN HEALTH CONDITIONS ===\n\n";
    context += conditionResults
      .map(
        (c, i) =>
          `--- Condition ${i + 1} (similarity: ${c.similarity.toFixed(2)}) ---\n${c.content}`
      )
      .join("\n\n");
  }

  const completion = await qwen.chat({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content: `You are a helpful health assistant analyzing blood test results and known health conditions. You provide clear, factual observations about lab values and how they may relate to the user's conditions. Always note when values are outside reference ranges. If the user has relevant conditions, consider how those conditions might affect lab values. Remind the user to consult their doctor for medical advice. Do not diagnose conditions — only describe what the numbers show and possible connections.`,
      },
      {
        role: "user",
        content: `Based on this health data:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.3,
    max_completion_tokens: 1024,
  });

  return {
    answer: completion.choices[0]?.message.content ?? "",
    sources: testResults.map((r) => ({
      testId: r.test_id,
      similarity: r.similarity,
      fileName: r.file_name,
      testDate: r.test_date,
    })),
    conditions: conditionResults.map((c) => ({
      conditionId: c.condition_id,
      content: c.content,
      similarity: c.similarity,
    })),
  };
}

export async function getMarkerTrend(query: string, markerName?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("find_similar_markers_over_time", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 50,
    exact_marker_name: markerName ?? null,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    marker_id: string;
    test_id: string;
    marker_name: string;
    content: string;
    similarity: number;
    value: string;
    unit: string;
    flag: string;
    test_date: string | null;
    file_name: string;
  }>;
}
