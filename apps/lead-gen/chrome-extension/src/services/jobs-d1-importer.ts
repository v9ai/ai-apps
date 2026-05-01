// ── D1 importer: bulk LinkedIn job-search → companies + opportunities ──
//
// Posts a batch of scraped LinkedIn jobs to the edge worker's
// /api/jobs/d1/import route, which writes them to a Cloudflare D1
// database (separate from Neon Postgres).
//
// Endpoint + bearer token come from build-time env (Vite define):
//   VITE_JOBS_D1_API_URL  e.g. http://localhost:8787 (wrangler dev)
//                          or   https://agenticleadgen-edge.<acct>.workers.dev
//   VITE_JOBS_D1_TOKEN    must match `wrangler secret put JOBS_D1_TOKEN`

const API_URL =
  import.meta.env.VITE_JOBS_D1_API_URL ?? "http://localhost:8787";
const TOKEN = (import.meta.env.VITE_JOBS_D1_TOKEN as string | undefined) ?? "";

export interface D1JobInput {
  title: string;
  company: string;
  url: string;
  companyLinkedinUrl?: string | null;
  location?: string | null;
  salary?: string | null;
  description?: string | null;
  archived?: boolean;
  // Voyager enrichment — populated when getJobPostingDetail succeeds.
  postedAt?: string | null;
  workplaceType?: string | null;       // "REMOTE" | "ON_SITE" | "HYBRID"
  employmentType?: string | null;      // "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP"
  experienceLevel?: string | null;
  applicantCount?: number | null;
  externalApplyUrl?: string | null;
  voyagerUrn?: string | null;
  state?: string | null;               // "LISTED" | "CLOSED" | "EXPIRED"
  easyApply?: boolean | null;
  formattedSalary?: string | null;
}

export interface ImportJobsToD1Response {
  ok: boolean;
  inserted: number;
  skipped: number;
  total: number;
  status?: number;
  requestId: string;
  attempts: number;
  error?: string;
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function postOnce(
  jobs: D1JobInput[],
  requestId: string,
): Promise<{
  ok: boolean;
  status?: number;
  data?: { inserted?: number; skipped?: number; total?: number; error?: string };
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/jobs/d1/import`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ jobs }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}: ${(text || res.statusText).slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      inserted?: number;
      skipped?: number;
      total?: number;
      error?: string;
    };
    return { ok: !data.error, status: res.status, data, error: data.error };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function importJobsToD1(
  jobs: D1JobInput[],
): Promise<ImportJobsToD1Response> {
  const requestId = newRequestId();
  if (!TOKEN) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      total: jobs.length,
      requestId,
      attempts: 0,
      error: "VITE_JOBS_D1_TOKEN is not set in the extension build.",
    };
  }
  if (jobs.length === 0) {
    return { ok: true, inserted: 0, skipped: 0, total: 0, requestId, attempts: 0 };
  }

  let attempts = 0;
  let last = await postOnce(jobs, requestId);
  attempts++;

  // Retry once on transient failures: 5xx or network throw. Skip 4xx — those
  // are validation errors that won't change on retry.
  const transient = !last.ok && (last.status === undefined || last.status >= 500);
  if (transient) {
    console.warn(
      `[D1Importer] requestId=${requestId} attempt 1 failed (${last.status ?? "network"}), retrying after 750ms`,
    );
    await new Promise((r) => setTimeout(r, 750));
    last = await postOnce(jobs, requestId);
    attempts++;
  }

  if (!last.ok) {
    console.warn(
      `[D1Importer] requestId=${requestId} FAIL attempts=${attempts} status=${last.status} err=${last.error}`,
    );
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      total: jobs.length,
      status: last.status,
      requestId,
      attempts,
      error: last.error || "Save failed",
    };
  }

  return {
    ok: true,
    inserted: last.data?.inserted ?? 0,
    skipped: last.data?.skipped ?? 0,
    total: last.data?.total ?? jobs.length,
    status: last.status,
    requestId,
    attempts,
    error: last.data?.error,
  };
}
