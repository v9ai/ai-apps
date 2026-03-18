/**
 * Typed fetch wrapper for the Python FastAPI blood-test service.
 *
 * All blood-test operations (upload, delete, embed) go through the Python
 * service to ensure consistent use of the LlamaIndex/FastEmbed pipeline.
 */

const PYTHON_API_URL =
  process.env.PYTHON_API_URL ?? "http://localhost:8001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

function authHeaders(): Record<string, string> | undefined {
  return INTERNAL_API_KEY ? { "x-api-key": INTERNAL_API_KEY } : undefined;
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
    headers: authHeaders(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed: ${detail}`);
  }

  return res.json();
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deletePython(
  testId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${PYTHON_API_URL}/blood-tests/${testId}?user_id=${userId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Delete failed: ${detail}`);
  }
}

// ── Embed (for search queries) ───────────────────────────────────────

export async function embedViaPython(text: string): Promise<number[]> {
  const res = await fetch(`${PYTHON_API_URL}/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Embed failed: ${detail}`);
  }

  const data: { embedding: number[] } = await res.json();
  return data.embedding;
}
