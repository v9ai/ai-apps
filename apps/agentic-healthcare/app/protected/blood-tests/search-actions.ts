"use server";

import { withAuth } from "@/lib/auth-helpers";
import { qwen } from "@/lib/embeddings";
import {
  searchTestsViaPython,
  searchMarkersViaPython,
  multiSearchViaPython,
  markerTrendViaPython,
  type MultiSearchResult,
} from "@/lib/python-api";

export async function searchBloodTests(query: string) {
  const { userId } = await withAuth();
  return searchTestsViaPython(query, userId);
}

export async function searchMarkers(query: string) {
  const { userId } = await withAuth();
  return searchMarkersViaPython(query, userId);
}

export async function askHealthQuestion(question: string) {
  const { userId } = await withAuth();

  const { tests, markers, conditions, medications, symptoms, appointments }: MultiSearchResult =
    await multiSearchViaPython(question, userId);

  const hasResults =
    tests.length > 0 ||
    markers.length > 0 ||
    conditions.length > 0 ||
    medications.length > 0 ||
    symptoms.length > 0 ||
    appointments.length > 0;

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

  if (tests.length > 0) {
    context += "=== BLOOD TEST RESULTS ===\n\n";
    context += tests
      .map(
        (r, i) =>
          `--- Test ${i + 1} (similarity: ${Number(r.similarity).toFixed(2)}) ---\n${r.content}`
      )
      .join("\n\n");
  }

  if (markers.length > 0) {
    context += "\n\n=== INDIVIDUAL MARKERS (hybrid search) ===\n\n";
    context += markers
      .map(
        (r, i) =>
          `--- ${r.marker_name} (score: ${Number(r.combined_score).toFixed(2)}) ---\n${r.content}`
      )
      .join("\n\n");
  }

  if (conditions.length > 0) {
    context += "\n\n=== KNOWN HEALTH CONDITIONS ===\n\n";
    context += conditions
      .map(
        (c, i) =>
          `--- Condition ${i + 1} (similarity: ${Number(c.similarity).toFixed(2)}) ---\n${c.content}`
      )
      .join("\n\n");
  }

  if (medications.length > 0) {
    context += "\n\n=== MEDICATIONS ===\n\n";
    context += medications
      .map(
        (m, i) =>
          `--- Medication ${i + 1} (similarity: ${Number(m.similarity).toFixed(2)}) ---\n${m.content}`
      )
      .join("\n\n");
  }

  if (symptoms.length > 0) {
    context += "\n\n=== SYMPTOM JOURNAL ===\n\n";
    context += symptoms
      .map(
        (s, i) =>
          `--- Symptom ${i + 1} (similarity: ${Number(s.similarity).toFixed(2)}) ---\n${s.content}`
      )
      .join("\n\n");
  }

  if (appointments.length > 0) {
    context += "\n\n=== DOCTOR'S NOTES ===\n\n";
    context += appointments
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
    sources: tests.map((r) => ({
      testId: r.test_id,
      similarity: Number(r.similarity),
      fileName: r.file_name,
      testDate: r.test_date,
    })),
    conditions: conditions.map((c) => ({
      conditionId: c.condition_id,
      content: c.content,
      similarity: Number(c.similarity),
    })),
    medications: medications.map((m) => ({
      medicationId: m.medication_id,
      content: m.content,
      similarity: Number(m.similarity),
    })),
    symptoms: symptoms.map((s) => ({
      symptomId: s.symptom_id,
      content: s.content,
      similarity: Number(s.similarity),
    })),
    appointments: appointments.map((a) => ({
      appointmentId: a.appointment_id,
      content: a.content,
      similarity: Number(a.similarity),
    })),
  };
}

export async function getMarkerTrend(query: string, markerName?: string) {
  const { userId } = await withAuth();
  return markerTrendViaPython(query, userId, markerName);
}
