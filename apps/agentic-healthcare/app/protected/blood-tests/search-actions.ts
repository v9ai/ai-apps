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

  // Search blood tests, markers, conditions, medications, symptoms, and appointments in parallel
  const [testResults, markerResults, conditionResults, medicationResults, symptomResults, appointmentResults] = await Promise.all([
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
    supabase
      .rpc("hybrid_search_markers", {
        query_text: question,
        query_embedding: JSON.stringify(embedding),
        match_count: 5,
        fts_weight: 0.3,
        vector_weight: 0.7,
        match_threshold: 0.3,
      })
      .then((r) => (r.data ?? []) as Array<{
        marker_id: string;
        test_id: string;
        marker_name: string;
        content: string;
        fts_rank: number;
        vector_similarity: number;
        combined_score: number;
      }>),
    searchConditions(embedding),
    (async () => {
      try {
        const r = await supabase.rpc("match_medications", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
        });
        return (r.data ?? []) as Array<{
          id: string;
          medication_id: string;
          content: string;
          similarity: number;
        }>;
      } catch {
        return [] as Array<{ id: string; medication_id: string; content: string; similarity: number }>;
      }
    })(),
    (async () => {
      try {
        const r = await supabase.rpc("match_symptoms", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
        });
        return (r.data ?? []) as Array<{
          id: string;
          symptom_id: string;
          content: string;
          similarity: number;
        }>;
      } catch {
        return [] as Array<{ id: string; symptom_id: string; content: string; similarity: number }>;
      }
    })(),
    (async () => {
      try {
        const r = await supabase.rpc("match_appointments", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
        });
        return (r.data ?? []) as Array<{
          id: string;
          appointment_id: string;
          content: string;
          similarity: number;
        }>;
      } catch {
        return [] as Array<{ id: string; appointment_id: string; content: string; similarity: number }>;
      }
    })(),
  ]);

  const hasResults = testResults.length > 0 || markerResults.length > 0 ||
    conditionResults.length > 0 || medicationResults.length > 0 ||
    symptomResults.length > 0 || appointmentResults.length > 0;

  if (!hasResults) {
    return {
      answer:
        "I couldn't find any health data relevant to your question. Please upload blood tests, add conditions, medications, symptoms, or appointment notes first.",
      sources: [],
      conditions: [],
      medications: [],
      symptoms: [],
      appointments: [],
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

  if (markerResults.length > 0) {
    context += "\n\n=== INDIVIDUAL MARKERS (hybrid search) ===\n\n";
    context += markerResults
      .map(
        (r, i) =>
          `--- ${r.marker_name} (score: ${r.combined_score.toFixed(2)}) ---\n${r.content}`
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

  if (medicationResults.length > 0) {
    context += "\n\n=== MEDICATIONS ===\n\n";
    context += medicationResults
      .map(
        (m, i) =>
          `--- Medication ${i + 1} (similarity: ${m.similarity.toFixed(2)}) ---\n${m.content}`
      )
      .join("\n\n");
  }

  if (symptomResults.length > 0) {
    context += "\n\n=== SYMPTOM JOURNAL ===\n\n";
    context += symptomResults
      .map(
        (s, i) =>
          `--- Symptom ${i + 1} (similarity: ${s.similarity.toFixed(2)}) ---\n${s.content}`
      )
      .join("\n\n");
  }

  if (appointmentResults.length > 0) {
    context += "\n\n=== DOCTOR'S NOTES ===\n\n";
    context += appointmentResults
      .map(
        (a, i) =>
          `--- Appointment ${i + 1} (similarity: ${a.similarity.toFixed(2)}) ---\n${a.content}`
      )
      .join("\n\n");
  }

  const completion = await qwen.chat({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content: `You are a helpful health assistant analyzing a user's complete health profile including blood test results, individual markers, known conditions, medications, symptom journal entries, and doctor's appointment notes. You provide clear, factual observations about lab values and how they may relate to the user's conditions and medications. Always note when values are outside reference ranges. Consider medication interactions and how conditions might affect lab values. Cross-reference symptoms with lab results when relevant. Remind the user to consult their doctor for medical advice. Do not diagnose conditions — only describe what the data shows and possible connections.`,
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
    medications: medicationResults.map((m) => ({
      medicationId: m.medication_id,
      content: m.content,
      similarity: m.similarity,
    })),
    symptoms: symptomResults.map((s) => ({
      symptomId: s.symptom_id,
      content: s.content,
      similarity: s.similarity,
    })),
    appointments: appointmentResults.map((a) => ({
      appointmentId: a.appointment_id,
      content: a.content,
      similarity: a.similarity,
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
