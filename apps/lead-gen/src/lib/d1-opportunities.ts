export type D1OpportunityRow = {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  tags: string | null;
  location: string | null;
  salary: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
  company_name: string | null;
  company_key: string | null;
};

export async function fetchD1Opportunities(): Promise<D1OpportunityRow[]> {
  const base = process.env.EDGE_WORKER_URL;
  const token = process.env.JOBS_D1_TOKEN;
  if (!base || !token) {
    console.warn("[d1-opportunities] EDGE_WORKER_URL or JOBS_D1_TOKEN missing — skipping D1 fetch");
    return [];
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/jobs/d1/opportunities?limit=500`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[d1-opportunities] worker returned ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { rows?: D1OpportunityRow[] };
    return body.rows ?? [];
  } catch (err) {
    console.warn("[d1-opportunities] fetch failed:", err);
    return [];
  }
}
