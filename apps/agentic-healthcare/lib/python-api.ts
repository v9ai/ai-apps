/**
 * Typed fetch wrapper for the Python FastAPI service.
 *
 * ALL embedding operations go through Python to ensure consistent use
 * of the LlamaIndex/FastEmbed bge-large-en-v1.5 model (1024-dim).
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

// ── Embed text (search queries — kept for backwards compat) ──────────

export async function embedViaPython(text: string): Promise<number[]> {
  const res = await post("/embed/text", { text });
  const data: { embedding: number[] } = await res.json();
  return data.embedding;
}

// ── Embed condition ─────────────────────────────────────────────────

export async function embedConditionViaPython(
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null,
): Promise<void> {
  await post("/embed/condition", {
    condition_id: conditionId,
    user_id: userId,
    name,
    notes,
  });
}

// ── Embed medication ────────────────────────────────────────────────

export async function embedMedicationViaPython(
  medicationId: string,
  userId: string,
  name: string,
  opts: {
    dosage?: string | null;
    frequency?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  await post("/embed/medication", {
    medication_id: medicationId,
    user_id: userId,
    name,
    dosage: opts.dosage ?? null,
    frequency: opts.frequency ?? null,
    notes: opts.notes ?? null,
  });
}

// ── Embed symptom ───────────────────────────────────────────────────

export async function embedSymptomViaPython(
  symptomId: string,
  userId: string,
  description: string,
  opts: {
    severity?: string | null;
    loggedAt?: string | null;
  },
): Promise<void> {
  await post("/embed/symptom", {
    symptom_id: symptomId,
    user_id: userId,
    description,
    severity: opts.severity ?? null,
    logged_at: opts.loggedAt ?? null,
  });
}

// ── Embed appointment ───────────────────────────────────────────────

export async function embedAppointmentViaPython(
  appointmentId: string,
  userId: string,
  title: string,
  opts: {
    provider?: string | null;
    notes?: string | null;
    appointmentDate?: string | null;
  },
): Promise<void> {
  await post("/embed/appointment", {
    appointment_id: appointmentId,
    user_id: userId,
    title,
    provider: opts.provider ?? null,
    notes: opts.notes ?? null,
    appointment_date: opts.appointmentDate ?? null,
  });
}
