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
}

export interface ImportJobsToD1Response {
  ok: boolean;
  inserted: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function importJobsToD1(
  jobs: D1JobInput[],
): Promise<ImportJobsToD1Response> {
  if (!TOKEN) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      total: jobs.length,
      error: "VITE_JOBS_D1_TOKEN is not set in the extension build.",
    };
  }
  if (jobs.length === 0) {
    return { ok: true, inserted: 0, skipped: 0, total: 0 };
  }

  try {
    const res = await fetch(`${API_URL}/api/jobs/d1/import`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ jobs }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        inserted: 0,
        skipped: 0,
        total: jobs.length,
        error: `HTTP ${res.status}: ${text || res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      inserted?: number;
      skipped?: number;
      total?: number;
      error?: string;
    };
    return {
      ok: !data.error,
      inserted: data.inserted ?? 0,
      skipped: data.skipped ?? 0,
      total: data.total ?? jobs.length,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      total: jobs.length,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
