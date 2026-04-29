// ── Visit tracker: record + dedup-check Browse Recruiters profile hits ──
//
// Talks to the agenticleadgen-edge Cloudflare Worker's D1 `contact_visits`
// table via two routes added in edge/src/index.ts:
//
//   POST /api/contacts/d1/visits         — upsert one visit row
//   POST /api/contacts/d1/visits/recent  — bulk-check which URLs were visited
//
// Reuses the same env vars as `jobs-d1-importer.ts` (VITE_JOBS_D1_API_URL +
// VITE_JOBS_D1_TOKEN) so we don't introduce a new build-time secret.
//
// Errors are intentionally non-fatal: `recordVisit` swallows everything (it's a
// best-effort audit), and `filterRecentlyVisited` returns an empty Set on any
// failure so a transient outage never blocks a recruiter run.

const API_URL =
  import.meta.env.VITE_JOBS_D1_API_URL ?? "http://localhost:8787";
const TOKEN = (import.meta.env.VITE_JOBS_D1_TOKEN as string | undefined) ?? "";

console.log(
  `[VisitTracker] D1 base resolved to: ${API_URL}` +
    (API_URL.includes("localhost") ? " ⚠️ localhost fallback — set VITE_JOBS_D1_API_URL." : "") +
    (TOKEN ? "" : " ⚠️ VITE_JOBS_D1_TOKEN unset — visit tracking will fail with 401."),
);

export async function recordVisit(
  contactId: number | null,
  linkedinUrl: string,
  ok: boolean,
  reason?: string,
): Promise<void> {
  const url = `${API_URL}/api/contacts/d1/visits`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        contact_id: contactId ?? 0,
        linkedin_url: linkedinUrl,
        ok,
        reason: reason ?? null,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.warn(
        `[VisitTracker] record ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
      return;
    }
    const data = (await res.json().catch(() => ({}))) as {
      id?: number;
      visited_at?: string;
    };
    console.log(
      `[VisitTracker] recorded visit id=${data.id ?? "?"} contactId=${contactId ?? 0} ok=${ok} (${Date.now() - t0}ms)`,
    );
  } catch (err) {
    console.warn(
      `[VisitTracker] record network error → ${url}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function filterRecentlyVisited(
  urls: string[],
  sinceDays: number,
): Promise<Set<string>> {
  const map = await fetchRecentVisitsMap(urls, sinceDays);
  return new Set(map.keys());
}

// Same as filterRecentlyVisited but preserves visited_at timestamps so
// callers can order by least-recently-visited (e.g. CRM-refresh cycling).
export async function fetchRecentVisitsMap(
  urls: string[],
  sinceDays: number,
): Promise<Map<string, string>> {
  if (urls.length === 0) return new Map();
  const url = `${API_URL}/api/contacts/d1/visits/recent`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ urls, since_days: sinceDays }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.warn(
        `[VisitTracker] recent ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
      return new Map();
    }
    const data = (await res.json()) as { visited?: Record<string, string> };
    const map = new Map(Object.entries(data.visited ?? {}));
    console.log(
      `[VisitTracker] recent lookup: ${map.size}/${urls.length} visited within ${sinceDays}d (${Date.now() - t0}ms)`,
    );
    return map;
  } catch (err) {
    console.warn(
      `[VisitTracker] recent network error → ${url}:`,
      err instanceof Error ? err.message : String(err),
    );
    return new Map();
  }
}
