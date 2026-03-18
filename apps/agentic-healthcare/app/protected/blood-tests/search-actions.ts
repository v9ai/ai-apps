"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { embedViaPython } from "@/lib/python-api";
import { qwen } from "@/lib/embeddings";
import { sql } from "drizzle-orm";

async function generateSearchEmbedding(text: string): Promise<number[]> {
  return embedViaPython(text);
}

export async function searchBloodTests(query: string) {
  const { userId } = await withAuth();

  const embedding = await generateSearchEmbedding(query);
  const embStr = `[${embedding.join(",")}]`;

  const data = await db.execute(sql`
    SELECT e.id, e.test_id, e.content,
           1 - (e.embedding <=> ${embStr}::vector) as similarity,
           t.file_name, t.test_date
    FROM blood_test_embeddings e
    JOIN blood_tests t ON t.id = e.test_id
    WHERE e.user_id = ${userId}
      AND 1 - (e.embedding <=> ${embStr}::vector) > 0.3
    ORDER BY e.embedding <=> ${embStr}::vector
    LIMIT 5
  `);

  return data.rows as Array<{
    id: string;
    test_id: string;
    content: string;
    similarity: number;
    file_name: string;
    test_date: string | null;
  }>;
}

export async function searchMarkers(query: string) {
  const { userId } = await withAuth();

  const embedding = await generateSearchEmbedding(query);
  const embStr = `[${embedding.join(",")}]`;

  const data = await db.execute(sql`
    SELECT id, marker_id, test_id, marker_name, content,
           1 - (embedding <=> ${embStr}::vector) as similarity
    FROM blood_marker_embeddings
    WHERE user_id = ${userId}
      AND 1 - (embedding <=> ${embStr}::vector) > 0.3
    ORDER BY embedding <=> ${embStr}::vector
    LIMIT 10
  `);

  return data.rows as Array<{
    id: string;
    marker_id: string;
    test_id: string;
    marker_name: string;
    content: string;
    similarity: number;
  }>;
}

async function searchConditions(embStr: string, userId: string) {
  const data = await db.execute(sql`
    SELECT id, condition_id, content,
           1 - (embedding <=> ${embStr}::vector) as similarity
    FROM condition_embeddings
    WHERE user_id = ${userId}
      AND 1 - (embedding <=> ${embStr}::vector) > 0.3
    ORDER BY embedding <=> ${embStr}::vector
    LIMIT 5
  `);

  return data.rows as Array<{
    id: string;
    condition_id: string;
    content: string;
    similarity: number;
  }>;
}

export async function askHealthQuestion(question: string) {
  const { userId } = await withAuth();

  const embedding = await generateSearchEmbedding(question);
  const embStr = `[${embedding.join(",")}]`;

  const [testResults, markerResults, conditionResults, medicationResults, symptomResults, appointmentResults] = await Promise.all([
    db.execute(sql`
      SELECT e.id, e.test_id, e.content,
             1 - (e.embedding <=> ${embStr}::vector) as similarity,
             t.file_name, t.test_date
      FROM blood_test_embeddings e
      JOIN blood_tests t ON t.id = e.test_id
      WHERE e.user_id = ${userId}
        AND 1 - (e.embedding <=> ${embStr}::vector) > 0.3
      ORDER BY e.embedding <=> ${embStr}::vector
      LIMIT 5
    `).then((r) => r.rows as Array<{
      id: string; test_id: string; content: string; similarity: number;
      file_name: string; test_date: string | null;
    }>),
    // Hybrid search: combine FTS + vector
    db.execute(sql`
      SELECT marker_id, test_id, marker_name, content,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${question})) as fts_rank,
             1 - (embedding <=> ${embStr}::vector) as vector_similarity,
             (0.3 * ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${question}))
              + 0.7 * (1 - (embedding <=> ${embStr}::vector))) as combined_score
      FROM blood_marker_embeddings
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${embStr}::vector) > 0.3
      ORDER BY combined_score DESC
      LIMIT 5
    `).then((r) => r.rows as Array<{
      marker_id: string; test_id: string; marker_name: string; content: string;
      fts_rank: number; vector_similarity: number; combined_score: number;
    }>),
    searchConditions(embStr, userId),
    db.execute(sql`
      SELECT id, medication_id, content,
             1 - (embedding <=> ${embStr}::vector) as similarity
      FROM medication_embeddings
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${embStr}::vector) > 0.3
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT 5
    `).then((r) => r.rows as Array<{
      id: string; medication_id: string; content: string; similarity: number;
    }>).catch(() => [] as Array<{ id: string; medication_id: string; content: string; similarity: number }>),
    db.execute(sql`
      SELECT id, symptom_id, content,
             1 - (embedding <=> ${embStr}::vector) as similarity
      FROM symptom_embeddings
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${embStr}::vector) > 0.3
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT 5
    `).then((r) => r.rows as Array<{
      id: string; symptom_id: string; content: string; similarity: number;
    }>).catch(() => [] as Array<{ id: string; symptom_id: string; content: string; similarity: number }>),
    db.execute(sql`
      SELECT id, appointment_id, content,
             1 - (embedding <=> ${embStr}::vector) as similarity
      FROM appointment_embeddings
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${embStr}::vector) > 0.3
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT 5
    `).then((r) => r.rows as Array<{
      id: string; appointment_id: string; content: string; similarity: number;
    }>).catch(() => [] as Array<{ id: string; appointment_id: string; content: string; similarity: number }>),
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
          `--- Test ${i + 1} (similarity: ${Number(r.similarity).toFixed(2)}) ---\n${r.content}`
      )
      .join("\n\n");
  }

  if (markerResults.length > 0) {
    context += "\n\n=== INDIVIDUAL MARKERS (hybrid search) ===\n\n";
    context += markerResults
      .map(
        (r, i) =>
          `--- ${r.marker_name} (score: ${Number(r.combined_score).toFixed(2)}) ---\n${r.content}`
      )
      .join("\n\n");
  }

  if (conditionResults.length > 0) {
    context += "\n\n=== KNOWN HEALTH CONDITIONS ===\n\n";
    context += conditionResults
      .map(
        (c, i) =>
          `--- Condition ${i + 1} (similarity: ${Number(c.similarity).toFixed(2)}) ---\n${c.content}`
      )
      .join("\n\n");
  }

  if (medicationResults.length > 0) {
    context += "\n\n=== MEDICATIONS ===\n\n";
    context += medicationResults
      .map(
        (m, i) =>
          `--- Medication ${i + 1} (similarity: ${Number(m.similarity).toFixed(2)}) ---\n${m.content}`
      )
      .join("\n\n");
  }

  if (symptomResults.length > 0) {
    context += "\n\n=== SYMPTOM JOURNAL ===\n\n";
    context += symptomResults
      .map(
        (s, i) =>
          `--- Symptom ${i + 1} (similarity: ${Number(s.similarity).toFixed(2)}) ---\n${s.content}`
      )
      .join("\n\n");
  }

  if (appointmentResults.length > 0) {
    context += "\n\n=== DOCTOR'S NOTES ===\n\n";
    context += appointmentResults
      .map(
        (a, i) =>
          `--- Appointment ${i + 1} (similarity: ${Number(a.similarity).toFixed(2)}) ---\n${a.content}`
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
      similarity: Number(r.similarity),
      fileName: r.file_name,
      testDate: r.test_date,
    })),
    conditions: conditionResults.map((c) => ({
      conditionId: c.condition_id,
      content: c.content,
      similarity: Number(c.similarity),
    })),
    medications: medicationResults.map((m) => ({
      medicationId: m.medication_id,
      content: m.content,
      similarity: Number(m.similarity),
    })),
    symptoms: symptomResults.map((s) => ({
      symptomId: s.symptom_id,
      content: s.content,
      similarity: Number(s.similarity),
    })),
    appointments: appointmentResults.map((a) => ({
      appointmentId: a.appointment_id,
      content: a.content,
      similarity: Number(a.similarity),
    })),
  };
}

export async function getMarkerTrend(query: string, markerName?: string) {
  const { userId } = await withAuth();

  const embedding = await generateSearchEmbedding(query);
  const embStr = `[${embedding.join(",")}]`;

  const nameFilter = markerName
    ? sql`AND e.marker_name = ${markerName}`
    : sql``;

  const data = await db.execute(sql`
    SELECT e.marker_id, e.test_id, e.marker_name, e.content,
           1 - (e.embedding <=> ${embStr}::vector) as similarity,
           m.value, m.unit, m.flag,
           t.test_date, t.file_name
    FROM blood_marker_embeddings e
    JOIN blood_markers m ON m.id = e.marker_id
    JOIN blood_tests t ON t.id = e.test_id
    WHERE e.user_id = ${userId}
      AND 1 - (e.embedding <=> ${embStr}::vector) > 0.3
      ${nameFilter}
    ORDER BY e.embedding <=> ${embStr}::vector
    LIMIT 50
  `);

  return data.rows as Array<{
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
