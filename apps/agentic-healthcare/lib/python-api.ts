/**
 * Typed fetch wrapper for the Python FastAPI service.
 *
 * Handles: blood test upload/delete, vector search, RAG chat.
 * Entity embedding (conditions, medications, symptoms, appointments) is
 * handled directly in Node.js via lib/embed.ts (@huggingface/transformers).
 */

const PYTHON_API_URL =
  process.env.PYTHON_API_URL ?? "http://localhost:8001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API_KEY) h["x-api-key"] = INTERNAL_API_KEY;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function post(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${PYTHON_API_URL}${path}`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Python API ${path} failed: ${detail}`);
  }
  return res;
}

// ── Upload ───────────────────────────────────────────────────────────

type UploadResult = {
  test_id: string;
  markers_count: number;
  status: string;
};

export async function uploadToPython(
  file: File,
  testDate: string | null,
  userId: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  if (testDate) form.append("test_date", testDate);

  const res = await fetch(`${PYTHON_API_URL}/upload`, {
    method: "POST",
    body: form,
    headers: INTERNAL_API_KEY ? { "x-api-key": INTERNAL_API_KEY } : undefined,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json();
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deletePython(
  testId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${PYTHON_API_URL}/blood-tests/${testId}?user_id=${userId}`,
    { method: "DELETE", headers: headers() },
  );
  if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
}

// ── Search (embed + pgvector query — all in Python) ──────────────────

export type TestSearchResult = {
  id: string;
  test_id: string;
  content: string;
  similarity: number;
  file_name: string;
  test_date: string | null;
};

export type MarkerSearchResult = {
  marker_id: string;
  test_id: string;
  marker_name: string;
  content: string;
  fts_rank: number;
  vector_similarity: number;
  combined_score: number;
};

export type ConditionSearchResult = {
  id: string;
  condition_id: string;
  content: string;
  similarity: number;
};

export type MedicationSearchResult = {
  id: string;
  medication_id: string;
  content: string;
  similarity: number;
};

export type SymptomSearchResult = {
  id: string;
  symptom_id: string;
  content: string;
  similarity: number;
};

export type AppointmentSearchResult = {
  id: string;
  appointment_id: string;
  content: string;
  similarity: number;
};

export type TrendSearchResult = {
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
};

export type MultiSearchResult = {
  tests: TestSearchResult[];
  markers: MarkerSearchResult[];
  conditions: ConditionSearchResult[];
  medications: MedicationSearchResult[];
  symptoms: SymptomSearchResult[];
  appointments: AppointmentSearchResult[];
};

export async function searchTestsViaPython(
  query: string,
  userId: string,
): Promise<TestSearchResult[]> {
  const res = await post("/search/tests", { query, user_id: userId });
  const data: { results: TestSearchResult[] } = await res.json();
  return data.results;
}

export async function searchMarkersViaPython(
  query: string,
  userId: string,
): Promise<MarkerSearchResult[]> {
  const res = await post("/search/markers", { query, user_id: userId });
  const data: { results: MarkerSearchResult[] } = await res.json();
  return data.results;
}

export async function multiSearchViaPython(
  question: string,
  userId: string,
): Promise<MultiSearchResult> {
  const res = await post("/search/multi", { query: question, user_id: userId });
  return res.json();
}

export async function markerTrendViaPython(
  query: string,
  userId: string,
  markerName?: string,
): Promise<TrendSearchResult[]> {
  const res = await post("/search/trend", {
    query,
    user_id: userId,
    marker_name: markerName ?? null,
  });
  const data: { results: TrendSearchResult[] } = await res.json();
  return data.results;
}

