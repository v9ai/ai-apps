/**
 * Typed fetch wrapper for the merged Python backend (research-thera + healthcare).
 *
 * The healthcare routers (`/upload`, `/embed/*`, `/search/*`, `/chat`) are mounted
 * inside the same FastAPI process that serves the LangGraph endpoints. Default URL
 * is the local dev port (2024); override with HEALTHCARE_BACKEND_URL in production.
 */

const BACKEND_URL =
  process.env.HEALTHCARE_BACKEND_URL ??
  process.env.PYTHON_API_URL ??
  "http://localhost:2024";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API_KEY) h["x-api-key"] = INTERNAL_API_KEY;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  answer: string;
  intent: string;
  intentConfidence: number;
  retrievalSources: string[];
  rerankScores: number[];
  guardPassed: boolean;
  guardIssues: string[];
  citations: string[];
};

export type SearchHit = {
  id: string;
  entityId: string;
  content: string;
  similarity: number;
};

export type SearchTestHit = {
  id: string;
  testId: string;
  content: string;
  similarity: number;
  fileName: string | null;
  testDate: string | null;
};

export type SearchMarkerHit = {
  markerId: string;
  testId: string;
  markerName: string;
  content: string;
  vectorSimilarity: number;
  combinedScore: number;
};

export type MultiSearchResult = {
  tests: SearchTestHit[];
  markers: SearchMarkerHit[];
  conditions: SearchHit[];
  medications: SearchHit[];
  symptoms: SearchHit[];
  appointments: SearchHit[];
};

export async function multiSearch(
  query: string,
  userId: string,
): Promise<MultiSearchResult> {
  const res = await fetch(`${BACKEND_URL}/search/multi`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ query, user_id: userId }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Healthcare /search/multi failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    tests: Array<{
      id: string;
      test_id: string;
      content: string;
      similarity: number;
      file_name?: string | null;
      test_date?: string | null;
    }>;
    markers: Array<{
      marker_id: string;
      test_id: string;
      marker_name: string;
      content: string;
      vector_similarity: number;
      combined_score: number;
    }>;
    conditions: Array<{
      id: string;
      condition_id: string;
      content: string;
      similarity: number;
    }>;
    medications: Array<{
      id: string;
      medication_id: string;
      content: string;
      similarity: number;
    }>;
    symptoms: Array<{
      id: string;
      symptom_id: string;
      content: string;
      similarity: number;
    }>;
    appointments: Array<{
      id: string;
      appointment_id: string;
      content: string;
      similarity: number;
    }>;
  };
  const flat = (
    rows: Array<{ id: string; content: string; similarity: number } & Record<string, unknown>>,
    fkField: string,
  ): SearchHit[] =>
    rows.map((r) => ({
      id: r.id,
      entityId: String(r[fkField] ?? r.id),
      content: r.content,
      similarity: r.similarity,
    }));
  return {
    tests: data.tests.map((r) => ({
      id: r.id,
      testId: r.test_id,
      content: r.content,
      similarity: r.similarity,
      fileName: r.file_name ?? null,
      testDate: r.test_date ?? null,
    })),
    markers: data.markers.map((r) => ({
      markerId: r.marker_id,
      testId: r.test_id,
      markerName: r.marker_name,
      content: r.content,
      vectorSimilarity: r.vector_similarity,
      combinedScore: r.combined_score,
    })),
    conditions: flat(data.conditions, "condition_id"),
    medications: flat(data.medications, "medication_id"),
    symptoms: flat(data.symptoms, "symptom_id"),
    appointments: flat(data.appointments, "appointment_id"),
  };
}

export type MarkerTrendHit = {
  markerId: string;
  testId: string;
  markerName: string;
  content: string;
  similarity: number;
  value: string;
  unit: string;
  flag: string;
  testDate: string | null;
  fileName: string;
};

export async function markerTrend(
  query: string,
  userId: string,
  markerName: string | null,
): Promise<MarkerTrendHit[]> {
  const res = await fetch(`${BACKEND_URL}/search/trend`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ query, user_id: userId, marker_name: markerName }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Healthcare /search/trend failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    results: Array<{
      marker_id: string;
      test_id: string;
      marker_name: string;
      content: string;
      similarity: number;
      value: string;
      unit: string;
      flag: string;
      test_date?: string | null;
      file_name: string;
    }>;
  };
  return data.results.map((r) => ({
    markerId: r.marker_id,
    testId: r.test_id,
    markerName: r.marker_name,
    content: r.content,
    similarity: r.similarity,
    value: r.value,
    unit: r.unit,
    flag: r.flag,
    testDate: r.test_date ?? null,
    fileName: r.file_name,
  }));
}

// ── Blood test upload + delete (Python /upload, /blood-tests/{id}) ──

export type UploadResult = {
  testId: string;
  markersCount: number;
  status: string;
};

export async function uploadBloodTestToPython(
  file: File,
  userId: string,
  testDate: string | null,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  if (testDate) form.append("test_date", testDate);

  const res = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: form,
    headers: INTERNAL_API_KEY ? { "x-api-key": INTERNAL_API_KEY } : undefined,
    signal: AbortSignal.timeout(280_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Healthcare /upload failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    test_id: string;
    markers_count: number;
    status: string;
  };
  return {
    testId: data.test_id,
    markersCount: data.markers_count,
    status: data.status,
  };
}

export async function deleteBloodTestViaPython(
  testId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/blood-tests/${encodeURIComponent(testId)}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: headers() },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(
      `Healthcare /blood-tests delete failed (${res.status}): ${detail}`,
    );
  }
}

export async function sendHealthcareChat(
  messages: ChatTurn[],
  userId: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ messages, user_id: userId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Healthcare /chat failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    answer: string;
    intent: string;
    intent_confidence: number;
    retrieval_sources: string[];
    rerank_scores?: number[];
    guard_passed: boolean;
    guard_issues: string[];
    citations: string[];
  };
  return {
    answer: data.answer ?? "",
    intent: data.intent ?? "",
    intentConfidence: data.intent_confidence ?? 0,
    retrievalSources: data.retrieval_sources ?? [],
    rerankScores: data.rerank_scores ?? [],
    guardPassed: data.guard_passed ?? true,
    guardIssues: data.guard_issues ?? [],
    citations: data.citations ?? [],
  };
}
